import { component$ } from '@builder.io/qwik';

export default component$(() => {
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
					<ul class="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="multiLevelDropdownButton">
						<li>
							<a href="#" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
								Dashboard
							</a>
						</li>
						<li>
							<button id="doubleDropdownButton" data-dropdown-toggle="doubleDropdown" data-dropdown-placement="right-start" type="button" class="flex w-full items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
								Dropdown
								<svg class="ms-3 h-2.5 w-2.5 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
									<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4" />
								</svg>
							</button>
							<div id="doubleDropdown" class="z-10 hidden w-44 divide-y divide-gray-100 rounded-lg bg-white shadow dark:bg-gray-700">
								<ul class="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="doubleDropdownButton">
									<li>
										<a href="#" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
											Overview
										</a>
									</li>
									<li>
										<a href="#" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
											My downloads
										</a>
									</li>
									<li>
										<a href="#" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
											Billing
										</a>
									</li>
									<li>
										<a href="#" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
											Rewards
										</a>
									</li>
								</ul>
							</div>
						</li>
						<li>
							<a href="#" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
								Earnings
							</a>
						</li>
						<li>
							<a href="#" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
								Sign out
							</a>
						</li>
					</ul>
				</section>
				<section class="w-1/2 bg-[#d3e5fa]"></section>
			</article>
			<footer
				style={{
					background: 'linear-gradient(to bottom, #4282d6 0%, #3b85e0 3%, #418ae3 5%, #418ae3 17%, #3c87e2 21%, #3786e4 26%, #3482e3 29%, #2e7ee1 39%, #2374df 49%, #2072db 57%, #196edb 62%, #176bd8 72%, #1468d5 75%, #1165d2 83%, #0f61cb 88%)',
				}}>
				<div class="flex text-sm font-light">
					<div class="grow"></div>
					<span>Log Off</span>
					<span>Turn Off Computer</span>
				</div>
			</footer>
		</aside>
	);
});
