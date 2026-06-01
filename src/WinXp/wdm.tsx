import { $, component$, useContext } from '@builder.io/qwik';
import { WindowManagerContext } from '../contexts';
import { closeApp, focusApp, focusedAppId, minimizeApp, toggleMaximizeApp } from './dwm/actions';
import { Window } from './dwm/Window';

/**
 * Desktop Window Manager (DWM) render surface.
 *
 * Reads the window-manager store and renders one {@link Window} per running
 * app, wiring the focus / minimize / maximize / close / geometry actions back
 * into the store. Stacking is handled purely by each window's `zIndex`.
 */
export default component$(() => {
	const wm = useContext(WindowManagerContext);
	const focused = focusedAppId(wm);

	return (
		<div class="pointer-events-none absolute inset-0">
			{wm.apps.map((app) => (
				<Window
					key={app.id}
					app={app}
					isFocus={focused === app.id}
					onFocus$={$((id: number) => focusApp(wm, id))}
					onMinimize$={$((id: number) => minimizeApp(wm, id))}
					onToggleMaximize$={$((id: number) => toggleMaximizeApp(wm, id))}
					onClose$={$((id: number) => closeApp(wm, id))}
					onGeometry$={$((id: number, g: { x: number; y: number; width: number; height: number }) => {
						wm.apps = wm.apps.map((a) => (a.id === id ? { ...a, ...g } : a));
					})}
				/>
			))}
		</div>
	);
});
