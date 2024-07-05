import React from "react";
import {
	primary,
	onPrimary,
	primaryVariant,
	secondary,
	secondaryVariant,
} from "@app/styles/colors";

export interface ViewProps extends React.HTMLAttributes<HTMLDivElement> {
	label: string | React.ReactNode;
}

export const View: React.FC<ViewProps> = (props) => {
	const topHeight = "10px";
	return (
		<>
			<div
				{...{
					...props,
					className: props.className ? props.className : "view",
				}}
				css={{
					backgroundColor: primary,
					color: onPrimary,

					// Prevent margin collapse
					padding: "10px",
					position: "relative",

					display: "grid",
					gap: "1rem",

					"input,button": {
						border: 0,
						backgroundColor: secondary,
						color: onPrimary,
						padding: "0.5rem",
					},

					"> div": {
						display: "flex",
						gap: "1rem",
						alignItems: "center",
						width: "100%",
						minWidth: "0",
						zIndex: 2,
					},

					"@media (max-width: 600px)": {
						gridTemplateColumns: "1fr",
					},
				}}
			>
				{props.children}
			</div>
		</>
	);
};
