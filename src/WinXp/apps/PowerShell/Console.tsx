import { component$, noSerialize, useContext, useSignal, useStyles$, useVisibleTask$, type NoSerialize } from '@builder.io/qwik';
import xtermStyles from '@xterm/xterm/css/xterm.css?inline';
import { TurnstileSiteKeyContext, WindowManagerContext } from '~/contexts';
import { AppKey, type AppInstance } from '~/contexts/types';
import { turnstileApi, waitForTurnstile } from '~/utils/turnstile-client';
import { attachWindow, createSandboxOnce, loadSandboxId, sendToSandbox } from '~/WinXp/apps/PowerShell/client';
import { PsCloseCode } from '~/WinXp/apps/PowerShell/types';
import { closeApp } from '~/WinXp/dwm/actions';

/** Windows console legacy 16-color palette, in xterm's ANSI order (black, red, green, yellow, blue, magenta, cyan, white, then bright). */
const LEGACY_PALETTE = {
	black: '#000000',
	red: '#800000',
	green: '#008000',
	yellow: '#808000',
	blue: '#000080',
	magenta: '#800080',
	cyan: '#008080',
	white: '#c0c0c0',
	brightBlack: '#808080',
	brightRed: '#ff0000',
	brightGreen: '#00ff00',
	brightYellow: '#ffff00',
	brightBlue: '#0000ff',
	brightMagenta: '#ff00ff',
	brightCyan: '#00ffff',
	brightWhite: '#ffffff',
} as const;

/** How each kind of console window looks: buffer size and colors. */
const CONSOLE_PROFILES = {
	/** Opened from the Windows PowerShell Start menu shortcut: 120x3000 buffer. It redefined DarkMagenta (#5) as the background blue RGB(1,36,86) and DarkYellow (#6) as the text gray RGB(238,237,240). */
	shortcut: {
		cols: 120,
		lines: 3000,
		theme: { ...LEGACY_PALETTE, magenta: '#012456', yellow: '#eeedf0', background: '#012456', foreground: '#eeedf0', cursor: '#eeedf0', cursorAccent: '#012456', selectionBackground: '#eeedf0', selectionForeground: '#012456' },
	},
	/** The console's own defaults (80x300 buffer, gray on black): Command Prompt, PowerShell started from it, and powershell.exe started from Run, where the shortcut's settings don't apply. */
	console: {
		cols: 80,
		lines: 300,
		theme: { ...LEGACY_PALETTE, background: '#000000', foreground: '#c0c0c0', cursor: '#c0c0c0', cursorAccent: '#000000', selectionBackground: '#c0c0c0', selectionForeground: '#000000' },
	},
} as const;

/**
 * A Windows PowerShell console window, or a Command Prompt window that has just run `powershell`. Real pwsh runs in this browser's sandbox; this component is the conhost: it renders output, forwards keystrokes, and closes itself when PowerShell exits.
 */
export const PowerShellConsole = component$<{ app?: AppInstance }>(({ app }) => {
	useStyles$(xtermStyles);
	const wm = useContext(WindowManagerContext);
	const turnstileSiteKey = useContext(TurnstileSiteKeyContext);

	const windowId = app?.data && 'windowId' in app.data ? app.data.windowId : '';
	const appId = app?.id ?? -1;
	const shell = app?.appKey === AppKey.CommandPrompt ? 'cmd' : 'powershell';
	const consoleDefaults = app?.data && 'consoleDefaults' in app.data ? app.data.consoleDefaults === true : false;
	const look = shell === 'cmd' || consoleDefaults ? 'console' : 'shortcut';
	const background = CONSOLE_PROFILES[look].theme.background;

	const host = useSignal<HTMLDivElement>();
	const turnstileBox = useSignal<HTMLDivElement>();
	const showChallenge = useSignal(false);
	const terminal = useSignal<NoSerialize<{ dispose(): void }>>();

	useVisibleTask$(async (ctx) => {
		if (!windowId || !host.value) return;

		// Registered before the first await: if the window closes while xterm loads, Turnstile runs or the sandbox is created, the steps below see `cancelled` and stop before attaching, so no PowerShell gets started that nothing would ever close.
		let cancelled = false;
		const isCancelled = () => cancelled;
		const disposers: (() => void)[] = [];
		ctx.cleanup(() => {
			cancelled = true;
			for (const dispose of disposers.reverse()) dispose();
		});

		const [{ Terminal }, { FitAddon }] = await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')]);
		if (isCancelled()) return;
		const profile = CONSOLE_PROFILES[look];
		const term = new Terminal({
			cols: profile.cols,
			rows: 25,
			scrollback: profile.lines,
			fontFamily: '"Lucida Console", monospace',
			fontSize: 12,
			lineHeight: 1,
			letterSpacing: 0,
			cursorStyle: 'underline',
			cursorBlink: true,
			theme: profile.theme,
			allowProposedApi: false,
			// conhost has no bell sound for PowerShell's default settings and no clickable links.
			linkHandler: null,
		});
		const fit = new FitAddon();
		term.loadAddon(fit);
		term.open(host.value);
		terminal.value = noSerialize(term);
		disposers.push(() => term.dispose());

		// tmux is the real terminal and already answers device/status queries (cursor position, device attributes, window ops). If xterm also answered, the replies would be typed into PowerShell.
		for (const id of [{ final: 'n' }, { prefix: '?', final: 'n' }, { final: 'c' }, { prefix: '>', final: 'c' }, { prefix: '=', final: 'c' }, { final: 't' }] as const) term.parser.registerCsiHandler(id, () => true);

		let opened = false;
		let ended = false;

		/** Like a process that died: its message goes to stderr (red on black, the way PowerShell's console host prints errors) and the console stops taking input. */
		const fail = (message: string) => {
			if (ended) return;
			ended = true;
			// eslint-disable-next-line no-control-regex -- strip control characters so a message can't smuggle escape sequences into the terminal
			const text = message.replace(/[\u0000-\u001f\u007f]/g, '');
			term.options.disableStdin = true;
			term.options.cursorBlink = false;
			term.write(`\x1b[0m\r\n\x1b[91;40m${text}\x1b[0m\r\n\x1b[?25l`);
		};

		/** Rows follow the window's height; the buffer width stays fixed like the shortcut's (narrower windows scroll horizontally). */
		const rows = () => Math.max(5, fit.proposeDimensions()?.rows ?? 25);

		const start = async (): Promise<string | undefined> => {
			const existing = loadSandboxId();
			if (existing) return existing;

			const result = await createSandboxOnce(async () => {
				const ts = await waitForTurnstile();
				if (!ts || !turnstileBox.value || !turnstileSiteKey.value) return undefined;
				const token = await new Promise<string | undefined>((resolve) => {
					const widget = ts.render(turnstileBox.value!, {
						sitekey: turnstileSiteKey.value,
						appearance: 'interaction-only',
						action: 'powershell-create-sandbox',
						callback: (t: string) => resolve(t),
						'before-interactive-callback': () => (showChallenge.value = true),
						'after-interactive-callback': () => (showChallenge.value = false),
						'error-callback': () => {
							resolve(undefined);
							return true;
						},
						'expired-callback': () => resolve(undefined),
					});
					disposers.push(() => turnstileApi()?.remove(widget));
				});
				showChallenge.value = false;
				return token;
			});
			if (result.ok) return result.id;
			// Another tab may have just created one.
			const raced = loadSandboxId();
			if (raced) return raced;
			fail(result.error);
			return undefined;
		};

		const sandboxId = await start();
		if (isCancelled() || !sandboxId) return;

		const detach = attachWindow(sandboxId, windowId, {
			onConnected: () => {
				opened = true;
				sendToSandbox(sandboxId, { t: 'open', w: windowId, cols: profile.cols, rows: rows(), shell });
			},
			onOutput: (bytes) => {
				term.write(bytes);
			},
			onMessage: (message) => {
				switch (message.t) {
					case 'snap':
						term.reset();
						term.write(message.d);
						break;
					case 'exit':
						// Like the real console: `exit` closes the window.
						closeApp(wm, appId);
						break;
					case 'error':
						fail(message.message);
						break;
				}
			},
			onClosed: (code) => {
				if (code === PsCloseCode.Expired || code === PsCloseCode.NotFound) {
					// The sandbox was deleted after 15 minutes of inactivity, so this PowerShell process is gone.
					closeApp(wm, appId);
					return;
				}
				fail('The connection to PowerShell was lost.');
			},
		});

		const input = term.onData((data) => opened && !ended && sendToSandbox(sandboxId, { t: 'in', w: windowId, d: data }));

		// QuickEdit mode: right-click copies the selection, or pastes when nothing is selected.
		const onContextMenu = (event: MouseEvent) => {
			event.preventDefault();
			const selection = term.getSelection();
			if (selection) {
				void navigator.clipboard.writeText(selection.replace(/\r?\n/g, '\r\n'));
				term.clearSelection();
				return;
			}
			if (ended) return;
			void navigator.clipboard.readText().then((text) => text && sendToSandbox(sandboxId, { t: 'in', w: windowId, d: text.replace(/\r?\n/g, '\r') }));
		};
		host.value.addEventListener('contextmenu', onContextMenu);

		// Resizing the window changes the visible rows (debounced so dragging doesn't flood the sandbox).
		let resizeTimer: ReturnType<typeof setTimeout> | undefined;
		const observer = new ResizeObserver(() => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(() => {
				const next = rows();
				if (next === term.rows) return;
				term.resize(profile.cols, next);
				if (opened) sendToSandbox(sandboxId, { t: 'resize', w: windowId, cols: profile.cols, rows: next });
			}, 100);
		});
		observer.observe(host.value);

		// Closing the tab kills this tab's PowerShell processes, like shutting down.
		const onPageHide = () => sendToSandbox(sandboxId, { t: 'close', w: windowId });
		addEventListener('pagehide', onPageHide);

		term.focus();

		disposers.push(() => {
			clearTimeout(resizeTimer);
			observer.disconnect();
			removeEventListener('pagehide', onPageHide);
			host.value?.removeEventListener('contextmenu', onContextMenu);
			input.dispose();
			// The window closed: end its PowerShell (kills the whole process tree in the sandbox).
			sendToSandbox(sandboxId, { t: 'close', w: windowId });
			detach();
		});
	});

	return (
		<div class="relative h-full w-full overflow-x-auto overflow-y-hidden" style={{ background }} onClick$={() => (terminal.value as { focus?: () => void } | undefined)?.focus?.()}>
			<div ref={host} class="h-full w-max min-w-full" />
			<script async defer src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"></script>
			<div ref={turnstileBox} class={['absolute inset-0 m-auto h-fit w-fit', showChallenge.value ? '' : 'pointer-events-none opacity-0']} />
		</div>
	);
});
