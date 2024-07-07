import { useEffect, useState } from "react";

export const useContainerDimensions = (
	ref: React.RefObject<HTMLDivElement>,
) => {
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const getDimensions = () =>
			ref.current && {
				width: ref.current.offsetWidth,
				height: ref.current.offsetHeight,
			};

		const handleResize = () => {
			setDimensions(getDimensions() || { width: 0, height: 0 });
		};

		if (ref.current) {
			setDimensions(getDimensions() || { width: 0, height: 0 });
		}

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, [ref]);

	return dimensions;
};
