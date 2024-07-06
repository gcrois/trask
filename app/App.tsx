// App.tsx
import { TaskQueue } from "@src/queue";

import "./styles/App.scss";

import { Trask } from "./components/trask/Trask";
import { Tile } from "./components/structural/Tile";

const tasks = new TaskQueue();

function App() {
	return (
		<>
			<Tile>
				<Trask queue={tasks} label="Trask A"/>
				<Trask queue={tasks} label="Trask B"/>
			</Tile>
		</>
	);
}

export default App;
