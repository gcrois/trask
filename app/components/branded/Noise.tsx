/* @ts-nocheck */
import React from "react";

interface NoiseGeneratorProps {
	width: number;
	height: number;
	baseFrequency: number;
	numOctaves: number;
	seed: number;
	surfaceScale: number;
	specularConstant: number;
	specularExponent: number;
	lightingColor: string;
	azimuth: number;
	elevation: number;
	backgroundColor: string;
}

const defaultProps: NoiseGeneratorProps = {
	width: 1024,
	height: 1024,
	baseFrequency: 0.1,
	numOctaves: 4,
	seed: 15,
	surfaceScale: 5,
	specularConstant: 0.1,
	specularExponent: 30,
	lightingColor: "#7957A8",
	azimuth: 6,
	elevation: 100,
	backgroundColor: "#7957a8",
};

export const NoiseGenerator: React.FC<Partial<NoiseGeneratorProps>> = (
	props,
) => {
	const {
		width,
		height,
		baseFrequency,
		numOctaves,
		seed,
		surfaceScale,
		specularConstant,
		specularExponent,
		lightingColor,
		azimuth,
		elevation,
		backgroundColor,
	} = { ...defaultProps, ...props };

	const filterId = `nnnoise-filter-${Math.random().toString(36).substr(2, 9)}`;
	console.log(width, height);

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			version="1.1"
			xmlns:xlink="http://www.w3.org/1999/xlink"
			xmlns:svgjs="http://svgjs.dev/svgjs"
			viewBox={`0 0 ${width} ${height}`}
			width={width}
			height={height}
		>
			<defs>
				<filter
					id={filterId}
					x="-20%"
					y="-20%"
					width="140%"
					height="140%"
					filterUnits="objectBoundingBox"
					primitiveUnits="userSpaceOnUse"
					color-interpolation-filters="linearRGB"
				>
					<feTurbulence
						type="fractalNoise"
						baseFrequency={baseFrequency}
						numOctaves={numOctaves}
						seed={seed}
						stitchTiles="stitch"
						x="0%"
						y="0%"
						width="100%"
						height="100%"
						result="turbulence"
					/>
					<feSpecularLighting
						surfaceScale={surfaceScale}
						specularConstant={specularConstant}
						specularExponent={specularExponent}
						lighting-color={lightingColor}
						x="0%"
						y="0%"
						width="100%"
						height="100%"
						in="turbulence"
						result="specularLighting"
					>
						<feDistantLight
							azimuth={azimuth}
							elevation={elevation}
						/>
					</feSpecularLighting>
				</filter>
			</defs>
			<rect width={width} height={height} fill="transparent" />
			<rect
				width={width}
				height={height}
				fill={backgroundColor}
				filter={`url(#${filterId})`}
			/>
		</svg>
	);
};
