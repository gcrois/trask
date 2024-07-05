module.exports = {
	extends: "stylelint-config-standard-scss",
	rules: {
		"declaration-empty-line-before": null,
	},
	overrides: [
		{
			files: ["**/*.scss"],
			customSyntax: "postcss-scss",
		},
	],
};
