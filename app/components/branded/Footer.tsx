import React from "react";
import {
	primary,
	onPrimary,
	primaryVariant,
	secondary,
	secondaryVariant,
	onSecondary,
} from "@app/styles/colors";

interface HeaderProps {
	children: React.ReactNode;
}

export const Footer: React.FC<HeaderProps> = ({ children }) => {
	return (
		<div
			css={{
				inset: 0,
				position: "absolute",
				backgroundColor: secondary,
				color: onSecondary,
				display: "flex",
				justifyContent: "center",
				alignItems: "flex-end",
			}}
		>
			<div>{children}</div>
		</div>
	);
};
