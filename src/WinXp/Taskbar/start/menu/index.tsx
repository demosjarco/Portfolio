import { component$ } from '@builder.io/qwik';
import MyComputer from '~/assets/windowsIcons/explorer_1_100-8.png?jsx';
import IeExplore from '~/assets/windowsIcons/iexplore_7-8.png?jsx';
import Globe from '~/assets/windowsIcons/inetcpl_1_1301-1.png?jsx';
import ProgramDefaults from '~/assets/windowsIcons/moricons_1_114-8.png?jsx';
import OutlookExpress from '~/assets/windowsIcons/msimn_1_2-3.png?jsx';
import ControlPanel from '~/assets/windowsIcons/shell32_1_137-2.png?jsx';
import PrintersAndFaxes from '~/assets/windowsIcons/shell32_1_138-5.png?jsx';
import Search from '~/assets/windowsIcons/shell32_1_23-2.png?jsx';
import MyDocuments from '~/assets/windowsIcons/shell32_1_235-2.png?jsx';
import MyPictures from '~/assets/windowsIcons/shell32_1_237-2.png?jsx';
import MyMusic from '~/assets/windowsIcons/shell32_1_238-2.png?jsx';
import HelpAndSupport from '~/assets/windowsIcons/shell32_1_24-2.png?jsx';
import Run from '~/assets/windowsIcons/shell32_1_25-5.png?jsx';
import TurnOff from '~/assets/windowsIcons/shell32_1_28-8.png?jsx';
import LogOff from '~/assets/windowsIcons/shell32_1_45-8.png?jsx';
import MyRecentDocuments from '~/assets/windowsIcons/shell32_1_46-1.png?jsx';
import AllPrograms from './allPrograms';
import Item from './item';
import RightPanelItem from './rightPanelItem';
import Separator from './separator';

export default component$(() => {
	return (
		<aside class="flex h-120 w-96 flex-col font-sans">
			<header
				class="flex shrink-0 overflow-hidden rounded-t-lg p-2"
				style={{
					background: 'linear-gradient(to bottom, #1868ce 0%, #0e60cb 12%, #0e60cb 20%, #1164cf 32%, #1667cf 33%, #1b6cd3 47%, #1e70d9 54%, #2476dc 60%, #297ae0 65%, #3482e3 77%, #3786e5 79%, #428ee9 90%, #4791eb 100%)',
					'box-shadow': 'inset 1px 1px 2px rgba(255, 255, 255, 0.5)',
				}}>
				<img
					src={new URL('https://github.com/demosjarco.png?size=48').href}
					class="inline-block h-12 w-12 border-2 border-solid border-white"
					width={48}
					height={48}
					decoding="async"
					loading="lazy"
					style={{
						'box-shadow': 'inset -1px 0 1px #206320',
					}}
				/>
				<div class="flex flex-col">
					<span
						class="my-auto ml-2 h-auto font-bold"
						style={{
							'text-shadow': '1px 1px 1px rgba(0,0,0,0.5)',
						}}>
						DemosJarco
					</span>
				</div>
			</header>
			<article class="divide flex min-h-0 grow divide-solid overflow-hidden">
				<section class="w-1/2 border-r border-solid border-r-[#95bdee] bg-white">
					<ul class="flex h-full flex-col py-2 text-sm text-black">
						{/* Hardcoded */}
						<Item type="Internet" name="Internet Explorer">
							<IeExplore />
						</Item>
						<Item type="E-mail" name="Outlook Express" href="mailto:demosjarco@protonmail.com">
							<OutlookExpress />
						</Item>
						<Separator />
						{/* Frequently used programs */}
						<Item name="GitHub" href="https://github.com/demosjarco">
							<Globe />
						</Item>
						<li class="grow"></li>
						<Separator />
						<AllPrograms />
					</ul>
				</section>
				<section class="w-1/2 bg-[#d3e5fa]">
					<ul class="px-1.5 py-2">
						<RightPanelItem name="My Documents" bold>
							<MyDocuments />
						</RightPanelItem>
						<RightPanelItem name="My Recent Documents" bold>
							<MyRecentDocuments class="h-6 w-6" style={{ 'object-fit': 'contain' }} />
						</RightPanelItem>
						<RightPanelItem name="My Pictures" bold>
							<MyPictures />
						</RightPanelItem>
						<RightPanelItem name="My Music" bold>
							<MyMusic />
						</RightPanelItem>
						<RightPanelItem name="My Computer" bold>
							<MyComputer />
						</RightPanelItem>
						<Separator />
						<RightPanelItem name="Control Panel">
							<ControlPanel />
						</RightPanelItem>
						<RightPanelItem name="Set Program Access and Defaults">
							<ProgramDefaults />
						</RightPanelItem>
						<RightPanelItem name="Printers and Faxes">
							<PrintersAndFaxes />
						</RightPanelItem>
						<Separator />
						<RightPanelItem name="Help and Support">
							<HelpAndSupport />
						</RightPanelItem>
						<RightPanelItem name="Search">
							<Search />
						</RightPanelItem>
						<RightPanelItem name="Run...">
							<Run />
						</RightPanelItem>
					</ul>
				</section>
			</article>
			<footer
				class="shrink-0 p-2.5"
				style={{
					background: 'linear-gradient(to bottom, #4282d6 0%, #3b85e0 3%, #418ae3 5%, #418ae3 17%, #3c87e2 21%, #3786e4 26%, #3482e3 29%, #2e7ee1 39%, #2374df 49%, #2072db 57%, #196edb 62%, #176bd8 72%, #1468d5 75%, #1165d2 83%, #0f61cb 88%)',
				}}>
				<div class="flex text-sm font-light">
					<div class="grow"></div>
					<button class="mr-0.5 flex">
						<LogOff class="mr-0.5 h-5 w-5" />
						<span class="ml-0.5">Log Off</span>
					</button>
					<button class="ml-0.5 flex">
						<TurnOff class="mr-0.5 h-5 w-5" />
						<span class="ml-0.5">Turn Off Computer</span>
					</button>
				</div>
			</footer>
		</aside>
	);
});
