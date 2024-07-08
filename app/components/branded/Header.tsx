import React from "react";
import {
	primary,
	onPrimary,
	primaryVariant,
	secondary,
	secondaryVariant,
	background,
} from "@app/styles/colors";

interface HeaderProps {
	title: string;
	leftItems?: React.ReactNode; // Optional left-aligned items
	rightItems?: React.ReactNode; // Optional right-aligned items
}

const FancyLink = ({ href, display }: { href: string; display: string }) => {
	return (
		<a
			href={href}
			target="_blank"
			css={{
				color: onPrimary,
				position: "relative",
				backgroundColor: background,
				padding: "0.1rem 0.2rem 0 0.1rem",
				boxSizing: "border-box",
				width: "100%",

				"&::before": {
					content: '""',
					position: "absolute",
					bottom: "-4px",
					left: 0,
					width: "0%",
					height: "2px",
					transition: "width 0.2s",
					backgroundColor: "white",
				},

				"&:hover": {
					backgroundColor: secondary,
					color: onPrimary,
					"&::before": {
						width: "100%",
					},
				},
			}}
		>
			{display}
		</a>
	);
};

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
				<span css={{ fontSize: "3rem" }}>{leftItems} | </span>
				<span css={{ fontSize: "2rem" }}>
					an application by{" "}
					<FancyLink
						href="https://g.regory.dev"
						display="Gregory Croisdale"
					/>
				</span>
			</div>
			<div
				css={{
					fontSize: "2.5rem",
				}}
			>
				{/* {rightItems} */}
				<FancyLink
					href="https://github.com/gcrois/trask"
					display="Github"
				/>{" "}
				| <FancyLink href="https://g.regory.dev" display="Docs" />
			</div>
		</div>
	);
};
