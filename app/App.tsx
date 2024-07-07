// App.tsx
import { ViewPort, LeftResizable, Fill, Top, Bottom } from "react-spaces";

import { TaskQueue } from "@src/queue";

import "./styles/App.scss";

import { Trask } from "./components/trask/Trask";
// import { Tile } from "./components/structural/Tile";
import { View } from "./components/structural/View";
import { Header } from "./components/branded/Header";

const tasks = new TaskQueue();

const buildDate = new Date(import.meta.env.VITE_BUILD_DATE);
const formattedDate = buildDate.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
});


function App() {
	return (
		<ViewPort className="App">
			<Top size={"60px"}>
				<Header
					title="Trask"
					leftItems="Trask"
					rightItems="Docs | Github"
				/>
			</Top>
			<Bottom size={"20px"}>Version {import.meta.env.VITE_APP_VERSION} built @ {formattedDate}</Bottom>
			<Fill>
				<View resizeDirection="left" size="50%">
					<Trask queue={tasks} label="Trask A" />
				</View>
				<View>
					<Trask queue={tasks} label="Trask B" />
				</View>
			</Fill>
			<View resizeDirection="bottom" size="50%">
				<Trask queue={tasks} label="Trask C" />
			</View>
		</ViewPort>
	);
}

export default App;
