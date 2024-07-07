import React from "react";

type TileChild = React.ReactElement<{
	children: React.ReactElement<{ label?: string }>;
}>;

export interface TileProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: TileChild[] | TileChild;
}

export const Tile: React.FC<TileProps> = (props) => {
	const [activeView, setActiveView] = React.useState(0);
	const views = React.useMemo(() => {
		return (
			React.Children.toArray(props.children).map((child) => {
				if (!React.isValidElement(child)) {
					return [null, null];
				}
				console.log(child);

				return [
					child.props.label ?? child.key ?? "Unnamed",
					React.cloneElement(child, {
						...child.props,
					}),
				];
			}) ?? []
		);
	}, [props.children]);

	return (
		<div>
			<div
				css={{
					display: "flex",
					width: "100%",
					backgroundColor: "gray",
					"> div": {
						backgroundColor: "lightBlue",
						padding: "0.25rem",
						"&.selected": {
							backgroundColor: "lightGreen",
						},
					},
				}}
			>
				{views.map(([label, _view], index) => (
					<div
						key={index}
						className={index === activeView ? "selected" : ""}
						onClick={() => setActiveView(index)}
					>
						{label}
					</div>
				))}
			</div>
			{views[activeView][1]}
		</div>
	);
};
