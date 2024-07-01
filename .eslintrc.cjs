module.exports = {
	root: true,
	env: { browser: true, es2020: true },
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:react-hooks/recommended',
	],
	ignorePatterns: ['docs', '.eslintrc.cjs'],
	parser: '@typescript-eslint/parser',
	plugins: ['react-refresh'],
	rules: {
		'react-refresh/only-export-components': [
			'warn',
			{ allowConstantExport: true },
		],
		'@typescript-eslint/semi': [1, 'always'],
		'@typescript-eslint/naming-convention': [
			'error',
			{
				'selector': 'function',
				'format': ['camelCase', 'PascalCase']
			},
		],
// must use tab
		'indent': ['error', 'tab'],
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': [
			'warn',
			{
				'argsIgnorePattern': '^_',
				'varsIgnorePattern': '^_',
				'caughtErrorsIgnorePattern': '^_'
			}
		],
		'@typescript-eslint/quotes': [
			'warn',
			'double',
			{
				'avoidEscape': true,
				'allowTemplateLiterals': true
			}
		]
	},
}
