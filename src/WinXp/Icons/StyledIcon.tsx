import { $, component$, useContext } from '@builder.io/qwik';
import MseIcon from '~/assets/windowsIcons/Microsoft_Security_Essentials_icon.png?w=32&h=32&jsx';
import MessengerIcon from '~/assets/windowsIcons/msmsgs_1_1-6.png?w=32&h=32&jsx';
import { IconStateContext, WindowManagerContext } from '../../contexts';
import { AppKey, type IconState } from '../../contexts/types';
import { launchApp } from '../dwm/actions';

/** Large 32px desktop icons keyed by the app they launch. */
const desktopIcons: Partial<Record<AppKey, typeof MseIcon>> = {
	[AppKey.SecurityEssentials]: MseIcon,
	[AppKey.Messenger]: MessengerIcon,
};

/**
 * A desktop icon. Single click selects (highlight), double click launches the
 * associated app via the window manager. The large 32px icon variant is used
 * here; the registry's 16px icon is reserved for titlebar/taskbar.
 */
export default component$<IconState>(({ id, appKey, title, isFocus }) => {
	const icons = useContext(IconStateContext);
	const wm = useContext(WindowManagerContext);
	const Icon = desktopIcons[appKey] ?? MseIcon;

	return (
		<button
			type="button"
			class="flex w-19 cursor-default flex-col items-center gap-0.5 p-1 text-white"
			onClick$={$(() => {
				icons.value = icons.value.map((i) => ({ ...i, isFocus: i.id === id }));
			})}
			onDblclick$={$(() => launchApp(wm, appKey))}>
			<span class={['p-0.5', isFocus ? 'bg-[#2f71cd]/60' : '']}>
				<Icon class="h-8 w-8 drop-shadow-[1px_1px_1px_rgba(0,0,0,0.5)]" />
			</span>
			<span
				class={['max-w-full px-1 text-center text-[11px] leading-tight', isFocus ? 'bg-[#0b61ff] text-white' : 'text-white']}
				style={{
					'text-shadow': isFocus ? 'none' : '1px 1px 1px rgba(0,0,0,0.8)',
				}}>
				{title}
			</span>
		</button>
	);
});
