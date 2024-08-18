// App.tsx
import { ViewPort, LeftResizable, Fill, Top, Bottom } from "react-spaces";

import { TaskQueue } from "@src/queue";

import "./styles/App.scss";
import "./styles/Trask.scss";

import { Trask } from "./components/trask/Trask";
import { View } from "./components/structural/View";
import { Header } from "./components/branded/Header";
import { Footer } from "./components/branded/Footer";
import { WorkerStatus } from "@src/workers";
import { Workers } from "./components/trask/Workers";
import { Tasks } from "./components/trask/Task";
import { Queue } from "./components/trask/Queue";

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
			<Bottom size={"20px"}>
				<Footer>
					Version {import.meta.env.VITE_APP_VERSION} built @{" "}
					{formattedDate}
				</Footer>
			</Bottom>
			<Fill>
				<View resizeDirection="left" size="50%">
					<Workers queue={tasks} />
				</View>
				<View>
					<Tasks queue={tasks} />
				</View>
			</Fill>
			<View resizeDirection="bottom" size="50%">
				<Queue queue={tasks} />
			</View>
		</ViewPort>
	);
}

export default App;
