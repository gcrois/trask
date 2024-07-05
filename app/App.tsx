// App.tsx
import { TaskQueue } from "@src/queue";

import "./styles/App.scss";

import { Trask } from "./components/trask/Trask";

const tasks = new TaskQueue();

function App() {
	return (
		<>
			<Trask queue={tasks} />
			<Trask queue={tasks} />
		</>
	);
}

export default App;
