/** @type {import('tailwindcss').Config} */
module.exports = {
	theme: {
		extend: {
			screens: {
				xxs: '320px',
			},
			keyframes: {
				powerOffAnimation: {
					'0%': { filter: 'brightness(1) grayscale(0)' },
					'30%': { filter: 'brightness(1) grayscale(0)' },
					'100%': { filter: 'brightness(0.6) grayscale(1)' },
				},
			},
		},
		fontFamily: {
			sans: ['Tahoma', 'Noto Sans', 'ui-sans-serif'],
			mono: ['Lucida Console', 'ui-monospace'],
		},
	},
};
