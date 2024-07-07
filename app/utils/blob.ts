import React from "react";
import ReactDOMServer from "react-dom/server";

// const NoiseBlob = new Blob([ReactDOMServer.renderToStaticMarkup(<NoiseGenerator/>)], { type: "image/svg+xml" });

export const reactComponentToBlob = (
	component: React.ReactElement,
	type: string = "image/svg+xml",
) => {
	return new Blob([ReactDOMServer.renderToStaticMarkup(component)], { type });
};

export const downloadBlob = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
};
