import { component$ } from '@builder.io/qwik';
import AccessibilityWizard from '~/assets/windowsIcons/accwiz_1_101-1.png?jsx';
import ProgramCompatibility from '~/assets/windowsIcons/ahui_1_2006-2.png?jsx';
import SetProgramAccess from '~/assets/windowsIcons/appwiz_1_1500-2.png?jsx';
import InternetBackgammon from '~/assets/windowsIcons/bckgzm_1_IDI_ICON-1.png?jsx';
import Calculator from '~/assets/windowsIcons/calc_1_SC-1.png?jsx';
import CharacterMap from '~/assets/windowsIcons/charmap_1_111-4.png?jsx';
import InternetCheckers from '~/assets/windowsIcons/chkrzm_1_IDI_ICON-1.png?jsx';
import DiskCleanup from '~/assets/windowsIcons/cleanmgr_1_104-2.png?jsx';
import CommandPrompt from '~/assets/windowsIcons/cmd_1_IDI_APPICON-1.png?jsx';
import DiskDefragmenter from '~/assets/windowsIcons/dfrgres_1_106-1.png?jsx';
import WindowsExplorer from '~/assets/windowsIcons/explorer_1_100-11.png?jsx';
import FreeCell from '~/assets/windowsIcons/freecell_1_601-4.png?jsx';
import InternetHearts from '~/assets/windowsIcons/hrtzres_1_1009-1.png?jsx';
import HyperTerminal from '~/assets/windowsIcons/hypertrm_100-3.png?jsx';
import NewConnectionWizard from '~/assets/windowsIcons/icwconn1_1_200-2.png?jsx';
import IeExplore from '~/assets/windowsIcons/iexplore_7-8.png?jsx';
import Magnifier from '~/assets/windowsIcons/magnify_1_106.png?jsx';
import FilesSettingsTransfer from '~/assets/windowsIcons/migwiz_1_2000-2.png?jsx';
import Synchronize from '~/assets/windowsIcons/mobsync_1_126.png?jsx';
import MovieMaker from '~/assets/windowsIcons/moviemk_1_128-2.png?jsx';
import Hearts from '~/assets/windowsIcons/mshearts_1_31234-3.png?jsx';
import OutlookExpress from '~/assets/windowsIcons/msimn_1_2-3.png?jsx';
import SystemInformation from '~/assets/windowsIcons/msinfo32_1_128-1.png?jsx';
import WindowsMessenger from '~/assets/windowsIcons/msmsgs_1_1-2.png?jsx';
import Paint from '~/assets/windowsIcons/mspaint_1_1100.png?jsx';
import ScheduledTasks from '~/assets/windowsIcons/mstask_1_100-2.png?jsx';
import RemoteDesktop from '~/assets/windowsIcons/mstsc_1_101-2.png?jsx';
import Narrator from '~/assets/windowsIcons/narrator_1_102-1.png?jsx';
import NetworkSetupWizard from '~/assets/windowsIcons/netsetup_1_3000-1.png?jsx';
import NetworkConnections from '~/assets/windowsIcons/netshell_0-10.png?jsx';
import Notepad from '~/assets/windowsIcons/notepad_1_2-2.png?jsx';
import Backup from '~/assets/windowsIcons/ntbackup_1_101-1.png?jsx';
import OnScreenKeyboard from '~/assets/windowsIcons/osk_1_156.png?jsx';
import Pinball from '~/assets/windowsIcons/pinball_1_ICON_1-2.png?jsx';
import RemoteAssistance from '~/assets/windowsIcons/rcimlby_1_201-4.png?jsx';
import SystemRestore from '~/assets/windowsIcons/rstrui_1_110-1.png?jsx';
import InternetReversi from '~/assets/windowsIcons/rvsezm_1_IDI_ICON-1.png?jsx';
import WindowsCatalog from '~/assets/windowsIcons/shell32_1_47-2.png?jsx';
import InternetSpades from '~/assets/windowsIcons/shvlzm_1_IDI_ICON-1.png?jsx';
import SoundRecorder from '~/assets/windowsIcons/sndrec32_1_10-1.png?jsx';
import VolumeControl from '~/assets/windowsIcons/sndvol32_1_300-1.png?jsx';
import Solitaire from '~/assets/windowsIcons/sol_1_500-1.png?jsx';
import SpiderSolitaire from '~/assets/windowsIcons/spider_1_103-2.png?jsx';
import TourWindowsXp from '~/assets/windowsIcons/tourstart_1_100-2.png?jsx';
import UtilityManager from '~/assets/windowsIcons/utilman_1_102-1.png?jsx';
import AddressBook from '~/assets/windowsIcons/wab_1_IDI_ICON_ABOOK-1.png?jsx';
import Minesweeper from '~/assets/windowsIcons/winmine_1_100-4.png?jsx';
import WindowsMediaPlayer from '~/assets/windowsIcons/wmplayer_1_120-2.png?jsx';
import WordPad from '~/assets/windowsIcons/wordpad_1_128-1.png?jsx';
import SecurityCenter from '~/assets/windowsIcons/wscui_1_200-2.png?jsx';
import WindowsUpdate from '~/assets/windowsIcons/wupdmgr_1_APPICON-2.png?jsx';
import WirelessNetworkSetup from '~/assets/windowsIcons/xpsp1res_1_100-2.png?jsx';
import Separator from './separator';
import SubMenu from './subMenu';
import SubMenuItem from './subMenuItem';

export default component$(() => {
	return (
		<li class="w-full p-1 text-black hover:bg-[#2f71cd] hover:text-white">
			<div class="flex">
				<div class="grow"></div>
				<button class="flex h-6 cursor-default" data-dropdown-toggle="allProgramsMenu" data-dropdown-placement="right-end" data-dropdown-trigger="hover" data-dropdown-offset-distance={0} data-dropdown-offset-skidding={0}>
					<span class="align-sub text-sm font-bold">All Programs</span>
					<svg class="my-auto ms-3 h-2.5 w-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
						<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4" />
					</svg>
				</button>
				<div class="grow"></div>
			</div>
			<div
				id="allProgramsMenu"
				class="z-10 hidden bg-white pl-px text-black shadow"
				style={{
					'box-shadow': 'inset 0 0 0 1px #72ade9, 2px 3px 3px rgb(0, 0, 0, 0.5)',
				}}>
				<ul class="text-sm whitespace-nowrap">
					<SubMenuItem name="Set Program Access and Defaults">
						<SetProgramAccess q:slot="icon" />
					</SubMenuItem>
					<SubMenuItem name="Windows Catalog">
						<WindowsCatalog q:slot="icon" />
					</SubMenuItem>
					<SubMenuItem name="Windows Update">
						<WindowsUpdate q:slot="icon" />
					</SubMenuItem>
					<Separator />
					<SubMenu>
						<SubMenuItem q:slot="root" folder={true} name="Work" />
						<SubMenu>
							<SubMenuItem q:slot="root" folder={true} name="Personal" />
							<SubMenuItem name="DNS Checker" href="https://dns.demosjarco.dev">
								<IeExplore q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="SearXNG" href="https://search.demosjarco.dev">
								<IeExplore q:slot="icon" />
							</SubMenuItem>
						</SubMenu>
						<SubMenu empty={true}>
							<SubMenuItem q:slot="root" folder={true} name="Seguro Cyber" />
						</SubMenu>
						<SubMenu>
							<SubMenuItem q:slot="root" folder={true} name="SRP" />
							<SubMenuItem name="Solutions Center" href="https://www.srpnet.com">
								<IeExplore q:slot="icon" />
							</SubMenuItem>
						</SubMenu>
						<SubMenu>
							<SubMenuItem q:slot="root" folder={true} name="Sushidata" />
							<SubMenuItem name="GitHub" href="https://github.com/chainfuse">
								<IeExplore q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Homepage" href="https://sushidata.com">
								<IeExplore q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Application" href="https://dash.sushidata.ai">
								<IeExplore q:slot="icon" />
							</SubMenuItem>
							<SubMenu>
								<SubMenuItem q:slot="root" folder={true} name="Storage Infra" />
								<SubMenuItem name="Part 1" href="https://sushidata.com/blog/2026/05/19/outgrew-cloudflare-d1-everything-tried-building-solution/">
									<IeExplore q:slot="icon" />
								</SubMenuItem>
							</SubMenu>
						</SubMenu>
						<SubMenu>
							<SubMenuItem q:slot="root" folder={true} name="U of A" />
							<SubMenuItem name="Cyberapolis" href="https://www.cyberapolis.com">
								<IeExplore q:slot="icon" />
							</SubMenuItem>
						</SubMenu>
					</SubMenu>
					<SubMenu>
						<SubMenuItem q:slot="root" folder={true} name="Accessories" />
						<SubMenu>
							<SubMenuItem q:slot="root" folder={true} name="Accessibility" />
							<SubMenuItem name="Accessibility Wizard">
								<AccessibilityWizard q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Magnifier">
								<Magnifier q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Narrator">
								<Narrator q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="On-Screen Keyboard">
								<OnScreenKeyboard q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Utility Manager">
								<UtilityManager q:slot="icon" />
							</SubMenuItem>
						</SubMenu>
						<SubMenu>
							<SubMenuItem q:slot="root" folder={true} name="Communications" />
							<SubMenuItem name="HyperTerminal">
								<HyperTerminal q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Network Connections">
								<NetworkConnections q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Network Setup Wizard">
								<NetworkSetupWizard q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="New Connection Wizard">
								<NewConnectionWizard q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Wireless Network Setup Wizard">
								<WirelessNetworkSetup q:slot="icon" />
							</SubMenuItem>
						</SubMenu>
						<SubMenu>
							<SubMenuItem q:slot="root" folder={true} name="Entertainment" />
							<SubMenuItem name="Sound Recorder">
								<SoundRecorder q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Volume Control">
								<VolumeControl q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Windows Media Player">
								<WindowsMediaPlayer q:slot="icon" />
							</SubMenuItem>
						</SubMenu>
						<SubMenu>
							<SubMenuItem q:slot="root" folder={true} name="System Tools" />
							<SubMenuItem name="Backup">
								<Backup q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Character Map">
								<CharacterMap q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Disk Cleanup">
								<DiskCleanup q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Disk Defragmenter">
								<DiskDefragmenter q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Files and Settings Transfer Wizard">
								<FilesSettingsTransfer q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Scheduled Tasks">
								<ScheduledTasks q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="Security Center">
								<SecurityCenter q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="System Information">
								<SystemInformation q:slot="icon" />
							</SubMenuItem>
							<SubMenuItem name="System Restore">
								<SystemRestore q:slot="icon" />
							</SubMenuItem>
						</SubMenu>
						<Separator />
						<SubMenuItem name="Address Book">
							<AddressBook q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Command Prompt">
							<CommandPrompt q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Notepad">
							<Notepad q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Paint">
							<Paint q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Calculator">
							<Calculator q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Program Compatibility Wizard">
							<ProgramCompatibility q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Remote Desktop Connection">
							<RemoteDesktop q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Synchronize">
							<Synchronize q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Tour Windows XP">
							<TourWindowsXp q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Windows Explorer">
							<WindowsExplorer q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="WordPad">
							<WordPad q:slot="icon" />
						</SubMenuItem>
					</SubMenu>
					<SubMenu>
						<SubMenuItem q:slot="root" folder={true} name="Games" />
						<SubMenuItem name="FreeCell">
							<FreeCell q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Hearts">
							<Hearts q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Internet Backgammon">
							<InternetBackgammon q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Internet Checkers">
							<InternetCheckers q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Internet Hearts">
							<InternetHearts q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Internet Reversi">
							<InternetReversi q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Internet Spades">
							<InternetSpades q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Minesweeper">
							<Minesweeper q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Pinball">
							<Pinball q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Solitaire">
							<Solitaire q:slot="icon" />
						</SubMenuItem>
						<SubMenuItem name="Spider Solitaire">
							<SpiderSolitaire q:slot="icon" />
						</SubMenuItem>
					</SubMenu>
					<SubMenu empty={true}>
						<SubMenuItem q:slot="root" folder={true} name="Startup" />
					</SubMenu>
					<Separator />
					<SubMenuItem name="Internet Explorer">
						<IeExplore q:slot="icon" />
					</SubMenuItem>
					<SubMenuItem name="Outlook Express">
						<OutlookExpress q:slot="icon" />
					</SubMenuItem>
					<SubMenuItem name="Remote Assistance">
						<RemoteAssistance q:slot="icon" />
					</SubMenuItem>
					<SubMenuItem name="Windows Media Player">
						<WindowsMediaPlayer q:slot="icon" />
					</SubMenuItem>
					<SubMenuItem name="Windows Messenger">
						<WindowsMessenger q:slot="icon" />
					</SubMenuItem>
					<SubMenuItem name="Windows Movie Maker">
						<MovieMaker q:slot="icon" />
					</SubMenuItem>
				</ul>
			</div>
		</li>
	);
});
