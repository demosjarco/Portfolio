/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{js,ts,jsx,tsx,mdx,css}', './node_modules/flowbite/**/*.js'],
	theme: {
		extend: {
			screens: {
				xxs: '320px',
			},
		},
		fontFamily: {
			sans: ['Tahoma', 'Noto Sans', 'ui-sans-serif'],
			mono: ['Lucida Console', 'ui-monospace'],
		},
	},
	plugins: [require('flowbite/plugin')],
};
