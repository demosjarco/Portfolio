import { component$, useContext, useTask$, type ClassList } from '@builder.io/qwik';

import NostalgicSolitaire from '~/assets/wallpapers/new/Microsoft_Nostalgic_Solitaire_4k.jpg?jsx';
import NostalgicWindows from '~/assets/wallpapers/new/Microsoft_Nostalgic_Windows_Wallpaper_4k.jpg?jsx';
import NostalgicClippy from '~/assets/wallpapers/new/Microsoft_Nostalic_Clippy_4k.jpg?jsx';
import NostalgicMsPaint from '~/assets/wallpapers/new/Microsoft_Nostalic_MSPaint_4k.jpg?jsx';
import SL3_1 from '~/assets/wallpapers/new/Surface_Laptop_3_01.jpg?jsx';
import SL3_2 from '~/assets/wallpapers/new/Surface_Laptop_3_02.jpg?jsx';
import SL3_3 from '~/assets/wallpapers/new/Surface_Laptop_3_03.jpg?jsx';
import SL3_4 from '~/assets/wallpapers/new/Surface_Laptop_3_04.jpg?jsx';
import SL3_5 from '~/assets/wallpapers/new/Surface_Laptop_3_05.jpg?jsx';
import SL3_6 from '~/assets/wallpapers/new/Surface_Laptop_3_06.jpg?jsx';
import SL3_7 from '~/assets/wallpapers/new/Surface_Laptop_3_07.jpg?jsx';
import SL3_8 from '~/assets/wallpapers/new/Surface_Laptop_3_08.jpg?jsx';

import Aquarium from '~/assets/wallpapers/original/Aquarium.jpg?jsx';
import Ascent from '~/assets/wallpapers/original/Ascent.jpg?jsx';
import Autumn from '~/assets/wallpapers/original/Autumn.jpg?jsx';
import Azul from '~/assets/wallpapers/original/Azul.jpg?jsx';
import Bliss from '~/assets/wallpapers/original/Bliss.jpg?jsx';
import Crystal from '~/assets/wallpapers/original/Crystal.jpg?jsx';
import Davinci from '~/assets/wallpapers/original/DaVinci.jpg?jsx';
import EnergyBliss from '~/assets/wallpapers/original/Energy Bliss.jpg?jsx';
import Follow from '~/assets/wallpapers/original/Follow.jpg?jsx';
import Friend from '~/assets/wallpapers/original/Friend.jpg?jsx';
import Home from '~/assets/wallpapers/original/Home.jpg?jsx';
import MoonFlower from '~/assets/wallpapers/original/Moon flower.jpg?jsx';
import Ocean from '~/assets/wallpapers/original/Ocean.jpg?jsx';
import Peace from '~/assets/wallpapers/original/Peace.jpg?jsx';
import PurpleFlower from '~/assets/wallpapers/original/Purple flower.jpg?jsx';
import Radiance from '~/assets/wallpapers/original/Radiance.jpg?jsx';
import RedMoonDesert from '~/assets/wallpapers/original/Red moon desert.jpg?jsx';
import Ripple from '~/assets/wallpapers/original/Ripple.jpg?jsx';
import Space from '~/assets/wallpapers/original/Space.jpg?jsx';
import Spring from '~/assets/wallpapers/original/Spring.jpg?jsx';
import StarTracks from '~/assets/wallpapers/original/StarTracks.jpg?jsx';
import Stonehenge from '~/assets/wallpapers/original/Stonehenge.jpg?jsx';
import Stream from '~/assets/wallpapers/original/Stream.jpg?jsx';
import Tulips from '~/assets/wallpapers/original/Tulips.jpg?jsx';
import VortecSpace from '~/assets/wallpapers/original/Vortec space.jpg?jsx';
import Wind from '~/assets/wallpapers/original/Wind.jpg?jsx';
import WindowsXP from '~/assets/wallpapers/original/Windows XP.jpg?jsx';
import { WallpaperContext } from '../contexts';
import { Wallpapers } from '../contexts/types';

export default component$(() => {
	const wallpaperSelection = useContext(WallpaperContext);

	useTask$(() => {
		const randomBytes = new Uint32Array(1);
		crypto.getRandomValues(randomBytes);

		wallpaperSelection.value = randomBytes[0]! % (Object.keys(Wallpapers).length / 2);
	});

	const styleClasses: ClassList = ['absolute', '-z-50', 'object-cover', 'object-center', 'block', 'h-full', 'w-full'];

	switch (wallpaperSelection.value) {
		// New
		case Wallpapers['Nostalgic Solitaire']:
			return <NostalgicSolitaire class={styleClasses} />;
		case Wallpapers['Nostalgic Windows']:
			return <NostalgicWindows class={styleClasses} />;
		case Wallpapers['Nostalgic Clippy']:
			return <NostalgicClippy class={styleClasses} />;
		case Wallpapers['Nostalgic MsPaint']:
			return <NostalgicMsPaint class={styleClasses} />;
		case Wallpapers['SL3 1']:
			return <SL3_1 class={styleClasses} />;
		case Wallpapers['SL3 2']:
			return <SL3_2 class={styleClasses} />;
		case Wallpapers['SL3 3']:
			return <SL3_3 class={styleClasses} />;
		case Wallpapers['SL3 4']:
			return <SL3_4 class={styleClasses} />;
		case Wallpapers['SL3 5']:
			return <SL3_5 class={styleClasses} />;
		case Wallpapers['SL3 6']:
			return <SL3_6 class={styleClasses} />;
		case Wallpapers['SL3 7']:
			return <SL3_7 class={styleClasses} />;
		case Wallpapers['SL3 8']:
			return <SL3_8 class={styleClasses} />;
		// Old
		case Wallpapers.Aquarium:
			return <Aquarium class={styleClasses} />;
		case Wallpapers.Ascent:
			return <Ascent class={styleClasses} />;
		case Wallpapers.Autumn:
			return <Autumn class={styleClasses} />;
		case Wallpapers.Azul:
			return <Azul class={styleClasses} />;
		case Wallpapers.Bliss:
			return <Bliss class={styleClasses} />;
		case Wallpapers.Crystal:
			return <Crystal class={styleClasses} />;
		case Wallpapers.DaVinci:
			return <Davinci class={styleClasses} />;
		case Wallpapers['Energy Bliss']:
			return <EnergyBliss class={styleClasses} />;
		case Wallpapers.Follow:
			return <Follow class={styleClasses} />;
		case Wallpapers.Friend:
			return <Friend class={styleClasses} />;
		case Wallpapers.Home:
			return <Home class={styleClasses} />;
		case Wallpapers['Moon flower']:
			return <MoonFlower class={styleClasses} />;
		case Wallpapers.Ocean:
			return <Ocean class={styleClasses} />;
		case Wallpapers.Peace:
			return <Peace class={styleClasses} />;
		case Wallpapers['Purple flower']:
			return <PurpleFlower class={styleClasses} />;
		case Wallpapers.Radiance:
			return <Radiance class={styleClasses} />;
		case Wallpapers['Red moon desert']:
			return <RedMoonDesert class={styleClasses} />;
		case Wallpapers.Ripple:
			return <Ripple class={styleClasses} />;
		case Wallpapers.Space:
			return <Space class={styleClasses} />;
		case Wallpapers.Spring:
			return <Spring class={styleClasses} />;
		case Wallpapers.StarTracks:
			return <StarTracks class={styleClasses} />;
		case Wallpapers.Stonehenge:
			return <Stonehenge class={styleClasses} />;
		case Wallpapers.Stream:
			return <Stream class={styleClasses} />;
		case Wallpapers.Tulips:
			return <Tulips class={styleClasses} />;
		case Wallpapers['Vortec space']:
			return <VortecSpace class={styleClasses} />;
		case Wallpapers.Wind:
			return <Wind class={styleClasses} />;
		case Wallpapers['Windows XP']:
			return <WindowsXP class={styleClasses} />;
	}
});
