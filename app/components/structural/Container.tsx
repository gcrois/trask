import React from "react";
import {
	primary,
	onPrimary,
	primaryVariant,
	secondary,
	secondaryVariant,
} from "@app/styles/colors";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
	label: string | React.ReactNode;
}

const Container: React.FC<ContainerProps> = (props) => {
	const topHeight = "10px";
	return (
		<>
			<div
				{...{
					...props,
					className: props.className ? props.className : "container",
				}}
				css={{
					backgroundColor: primary,
					color: onPrimary,

					// Prevent margin collapse
					margin: `${topHeight} 10px 10px 10px`,
					padding: "10px",
					position: "relative",

					display: "grid",
					gap: "1rem",

					"&::before": {
						content: "''",
						backgroundColor: primaryVariant,
						position: "absolute",
						inset: `-${topHeight} -10px -10px -10px`,
						zIndex: -1,
					},

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

export default Container;
