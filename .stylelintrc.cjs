module.exports = {
	defaultSeverity: "warning",
	extends: "stylelint-config-standard-scss",
	rules: {
		"declaration-empty-line-before": null,
		"color-hex-length": null,
	},
	overrides: [
		{
			files: ["**/*.scss"],
			customSyntax: "postcss-scss",
		},
	],
};
