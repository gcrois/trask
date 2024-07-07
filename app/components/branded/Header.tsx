import React from "react";
import {
	primary,
	onPrimary,
	primaryVariant,
	secondary,
	secondaryVariant,
} from "@app/styles/colors";

interface HeaderProps {
	title: string;
	leftItems?: React.ReactNode; // Optional left-aligned items
	rightItems?: React.ReactNode; // Optional right-aligned items
}

export const Header: React.FC<HeaderProps> = ({
	title,
	leftItems,
	rightItems,
}) => {
	return (
		<div
			css={{
				inset: 0,
				position: "absolute",
				backgroundColor: primaryVariant,
				display: "flex",
				justifyContent: "space-between",
				alignItems: "flex-end",
				padding: "0.5rem 1rem",
			}}
		>
			<div>
				<span css={{ fontSize: "3rem" }}>{leftItems} </span>
				<span css={{ fontSize: "2rem" }}>
					an application by <a href="https://g.regory.dev">Gregory Croisdale</a>
				</span>
			</div>
			<div
				css={{
					fontSize: "3rem",
				}}
			>
				{rightItems}
			</div>
		</div>
	);
};
