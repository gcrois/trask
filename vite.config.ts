import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import stylelint from "vite-plugin-stylelint";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react({
			jsxImportSource: "@emotion/react",
		}),
		stylelint({
			include: ["app/**/*.{css,scss}"],
		}),
	],
	base: "/trask/",
	worker: {
		format: "es",
	},
	resolve: {
		alias: {
			"@src": path.resolve(__dirname, "./src"),
			"@app": path.resolve(__dirname, "./app"),
			"@proto": path.resolve(__dirname, "./proto/ts"),
		},
	},
});
