import { useState, useEffect } from "react";
import { TWorker, WebWorkerAdapter, WorkerId } from "../trask/workers";
import { capitalizeText, reverseText, TaskType } from "../trask/types";
import TestWorker from "./worker?worker";
import { QueuedTask, QueuedTaskStatus, TaskQueue, TaskQueueEvent } from "../trask/queue";

const tasks = new TaskQueue();

function App() {
	const [input, setInput] = useState("");
	const [output, _setOutput] = useState<string[]>([]);

	const [workers, setWorkers] = useState<ReadonlyMap<string, TWorker>>(new Map());

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [queue, setQueue] = useState<ReadonlyMap<string, QueuedTask>>(new Map());

	useEffect(() => {
		const updateQueue = () => {
			setQueue(new Map(tasks.getTasks()));
		};

		const updateWorkers = () => {
			setWorkers(new Map(tasks.getWorkers()));
		};

		tasks.on(TaskQueueEvent.QueueChange, updateQueue);
		tasks.on(TaskQueueEvent.WorkerChange, updateWorkers);

		return () => {
			tasks.off(TaskQueueEvent.QueueChange, updateQueue);
			tasks.off(TaskQueueEvent.WorkerChange, updateWorkers);
		};
	}, []);

	const addWorker = () => {
		console.log("Adding worker");
		const newWorker = new WebWorkerAdapter(new TestWorker(), tasks);
		tasks.addWorker(newWorker);
	};

	const removeWorker = (id: WorkerId) => {
		tasks.removeWorker(id);
	};

	const addTask = (task: TaskType<string, string>) => {
		const id = tasks.addTask(task, input);
	};

	return (
		<div>
			<h1>Task Library Test</h1>
			<input
				type="text"
				value={input}
				onChange={(e) => setInput(e.target.value)}
				placeholder="Enter text"
			/>
			<button onClick={() => addTask(capitalizeText)}>Add Capitalize Task</button>
			<button onClick={() => addTask(reverseText)}>Add Reverse Task</button>
			<button onClick={addWorker}>Add Worker</button>
			{/* <button onClick={removeWorker}>Remove Worker</button> */}
			<div>
				<h2>Queue:</h2>
				<ul>
					{Array.from(queue).map(([id, task], index) => (
						<li key={index}>
							{/* Task {index + 1}: {task.task.name} {task.input} {task.status} {task.worker} */}
							Task {id.split("-")[0]}: {task.task.name}; Status: {QueuedTaskStatus[task.status]} {task.worker ? `Assigned to ${task.worker.split("-")[0]}` : ""} {task.endTime ? `${task.endTime - task.queuedTime}ms since queue, ${task.endTime - task.startTime!}ms compute` : ""}
						</li>
					))}
				</ul>

				<h2>Workers: {workers.size}</h2>
				<ul>
					{Array.from(workers).map(([id, worker], index) => (
						<li key={index}>
							{worker.status} - {worker.message}
							<button onClick={() => removeWorker(id)}>Remove Worker</button>
							<button onClick={() => worker.requestJob()}>Request Job</button>
						</li>
					))}
				</ul>
				<h2>Output:</h2>
				{output.map((result, index) => (
					<p key={index}>{result}</p>
				))}
			</div>
		</div>
	);
}

export default App;