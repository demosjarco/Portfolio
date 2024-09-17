/**
 * @type {import('eslint').Linter.BaseConfig}
 * @link https://github.com/cloudflare/workers-sdk/blob/main/packages/eslint-config-worker/index.js
 */
module.exports = {
	env: {
		browser: true,
		serviceworker: true,
		node: true,
		// https://eslint.org/docs/head/use/configure/language-options-deprecated#specifying-environments
		es2024: true,
	},
	extends: ['../.eslintrc.cjs', 'plugin:qwik/recommended'],
	parserOptions: {
		tsconfigRootDir: __dirname,
		project: ['./tsconfig.json'],
		ecmaVersion: 'latest',
		sourceType: 'module',
		ecmaFeatures: {
			jsx: true,
		},
	},
	plugins: ['qwik'],
	rules: {
		// We use visible task to defer `server$()` from page load
		'qwik/no-use-visible-task': 'off',
	},
};
