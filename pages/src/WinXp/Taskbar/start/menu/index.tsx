import { component$, noSerialize, useSignal, useVisibleTask$, type NoSerialize } from '@builder.io/qwik';
import { Dropdown } from 'flowbite';
import Item from './item';
import Separator from './separator';
import SubMenuItem from './subMenuItem';

import IeExplore from '~/assets/windowsIcons/iexplore_7-8.png?jsx';
import OutlookExpress from '~/assets/windowsIcons/msimn_1_2-3.png?jsx';
import TurnOff from '~/assets/windowsIcons/shell32_1_28-8.png?jsx';
import LogOff from '~/assets/windowsIcons/shell32_1_45-8.png?jsx';
import MSN from '~/assets/windowsIcons/shell32_239-6.png?jsx';
import SubMenu from './subMenu';

export default component$(() => {
	const allProgramsButton = useSignal<HTMLButtonElement>();
	const allProgramsMenuDiv = useSignal<HTMLDivElement>();
	const allProgramsMenuRef = useSignal<NoSerialize<Dropdown>>();

	useVisibleTask$(({ track, cleanup }) => {
		track(() => allProgramsButton.value);
		track(() => allProgramsMenuDiv.value);

		if (allProgramsButton.value && allProgramsMenuDiv.value) {
			allProgramsMenuRef.value = noSerialize(
				new Dropdown(allProgramsMenuDiv.value, allProgramsButton.value, {
					placement: 'right-end',
					triggerType: 'hover',
					offsetSkidding: 0,
					offsetDistance: 0,
				}),
			);
			// For debug
			// allProgramsMenuRef.value?.show();
		}

		cleanup(() => allProgramsMenuRef.value?.destroyAndRemoveInstance());
	});

	return (
		<aside class="flex h-[480px] w-96 flex-col">
			<header
				class="flex overflow-hidden rounded-t-lg p-2"
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
			<article class="divide flex grow divide-solid">
				<section class="w-1/2 border-r border-solid border-r-[#95bdee] bg-white">
					<ul class="py-2 text-sm text-gray-700 dark:text-gray-200">
						{/* Hardcoded */}
						<Item type="Internet" name="Internet Explorer">
							<IeExplore />
						</Item>
						<Item type="E-mail" name="Outlook Express">
							<OutlookExpress />
						</Item>
						<Separator />
						{/* Dynamic */}
						<Item name="Internet Explorer">
							<IeExplore />
						</Item>
						<Item name="Internet Explorer">
							<IeExplore />
						</Item>
						<Item name="Internet Explorer">
							<IeExplore />
						</Item>
						<Item name="Internet Explorer">
							<IeExplore />
						</Item>
						<Item name="Internet Explorer">
							<IeExplore />
						</Item>
						<Item name="Internet Explorer">
							<IeExplore />
						</Item>
						<Separator />
						<li class="w-full p-1 text-black hover:bg-[#316ac5] hover:text-white">
							<div class="flex">
								<div class="grow"></div>
								<button ref={allProgramsButton} class="flex h-6 cursor-default">
									<span class="align-sub text-sm font-bold">All Programs</span>
									<svg class="my-auto ms-3 h-2.5 w-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
										<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4" />
									</svg>
								</button>
								<div class="grow"></div>
							</div>
							<div
								ref={allProgramsMenuDiv}
								class="z-10 hidden bg-white pl-px text-black shadow"
								style={{
									'box-shadow': 'inset 0 0 0 1px #72ade9, 2px 3px 3px rgb(0, 0, 0, 0.5)',
								}}>
								<ul class="whitespace-nowrap text-sm">
									<SubMenuItem name="Set Program Access and Defaults"></SubMenuItem>
									<SubMenuItem name="Windows Catalog"></SubMenuItem>
									<SubMenuItem name="Windows Update"></SubMenuItem>
									<Separator />
									<SubMenu>
										<SubMenuItem q:slot="root" folder={true} name="Accessories" />
										<SubMenuItem name="Internet Explorer">
											<IeExplore q:slot="icon" />
										</SubMenuItem>
										<SubMenuItem name="Internet Explorer">
											<IeExplore q:slot="icon" />
										</SubMenuItem>
										<SubMenuItem name="Internet Explorer">
											<IeExplore q:slot="icon" />
										</SubMenuItem>
									</SubMenu>
									<SubMenu empty={true}>
										<SubMenuItem q:slot="root" folder={true} name="Games" />
									</SubMenu>
									<SubMenu empty={true}>
										<SubMenuItem q:slot="root" folder={true} name="Startup" />
									</SubMenu>
									<SubMenuItem name="Internet Explorer">
										<IeExplore q:slot="icon" />
									</SubMenuItem>
									<SubMenuItem name="MSN">
										<MSN q:slot="icon" />
									</SubMenuItem>
									<SubMenuItem name="Outlook Express">
										<OutlookExpress q:slot="icon" />
									</SubMenuItem>
								</ul>
							</div>
						</li>
					</ul>
				</section>
				<section class="w-1/2 bg-[#d3e5fa]"></section>
			</article>
			<footer
				class="p-2.5"
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
