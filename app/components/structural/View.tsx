import React, { useMemo, useState } from "react";
import {
	primary,
	onPrimary,
	primaryVariant,
	secondary,
	secondaryVariant,
} from "@app/styles/colors";
import {
	BottomResizable,
	Fill,
	LeftResizable,
	ResizeHandlePlacement,
	RightResizable,
	TopResizable,
	useCurrentSpace,
} from "react-spaces";

export interface ViewProps extends React.HTMLAttributes<HTMLDivElement> {
	resizeDirection?: "top" | "bottom" | "left" | "right" | "fill";
	size?: string;
}

const shadowOffset = "5px 5px 0px";

export const View: React.FC<ViewProps> = (props) => {
	const { resizeDirection } = props;
	const Resizable = useMemo(() => {
		switch (resizeDirection) {
			case "top":
				return TopResizable;
			case "bottom":
				return BottomResizable;
			case "left":
				return LeftResizable;
			case "right":
				return RightResizable;
			case "fill":
				return Fill;
			default:
				return Fill;
		}
	}, [resizeDirection]);

	const { size } = useCurrentSpace();

	// const rot = useState(Math.random() * 1 - 0.5)[0];

	return (
		<Resizable
			size={props.size || "100%"}
			handleSize={10}
			touchHandleSize={10}
			handlePlacement={ResizeHandlePlacement.Inside}
		>
			<div
				css={{
					filter: `drop-shadow(${shadowOffset} ${secondary}) drop-shadow(${shadowOffset} ${primaryVariant}) drop-shadow(3px 3px 3px rgba(0, 0, 0, 0.5))`,
					position: "absolute",
					inset: 0,
					transformOrigin: "center",
				}}
			>
				<div
					css={{
						position: "absolute",
						inset: 0,
						clipPath: `polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)`,
						backgroundColor: primary,
						color: onPrimary,
						margin: "20px",
					}}
				/>
			</div>
			<div
				{...{
					...props,
					className: props.className ? props.className : "view",
					resizeDirection: null,
				}}
				css={{
					// Prevent margin collapse
					padding: "10px",
					position: "absolute",
					inset: 0,

					boxSizing: "border-box",
					clipPath: `polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)`,

					display: "grid",
					gap: "1rem",
					margin: "20px",
					overflow: "auto",
				}}
			>
				{props.children}
			</div>
		</Resizable>
	);
};
