// App.tsx

import { useState, useEffect } from "react";
import { TWorker, WebWorkerAdapter, APIWorker, WorkerId } from "@src/workers";
import { Task, TaskType } from "@src/types";
import TestWorker from "./worker?worker";
import {
	QueuedTask,
	QueuedTaskStatus,
	TaskQueue,
	TaskQueueEvent,
} from "@src/queue";

import "./App.scss";

const defaultEndpoint = "http://localhost:8000";

const tasks = new TaskQueue();

function App() {
	const [input, setInput] = useState("");
	const [apiEndpoint, setApiEndpoint] = useState("");
	const [completedTasks, setCompletedTasks] = useState<string[]>([]);
	const [workers, setWorkers] = useState<ReadonlyMap<string, TWorker>>(
		new Map(),
	);
	const [queue, setQueue] = useState<ReadonlyMap<string, QueuedTask>>(
		new Map(),
	);

	useEffect(() => {
		const updateQueue = () => setQueue(new Map(tasks.getTasks()));
		const updateWorkers = () => setWorkers(new Map(tasks.getWorkers()));

		tasks.on(TaskQueueEvent.QueueChange, updateQueue);
		tasks.on(TaskQueueEvent.WorkerChange, updateWorkers);

		return () => {
			tasks.off(TaskQueueEvent.QueueChange, updateQueue);
			tasks.off(TaskQueueEvent.WorkerChange, updateWorkers);
		};
	}, []);

	const addWebWorker = () => {
		const newWorker = new WebWorkerAdapter(new TestWorker(), tasks);
		tasks.addWorker(newWorker);
	};

	const addAPIWorker = () => {
		const newWorker = new APIWorker(apiEndpoint || defaultEndpoint, tasks);

		tasks.addWorker(newWorker);
	};

	const removeWorker = (id: WorkerId) => {
		tasks.removeWorker(id);
	};

	const addTask = <T extends TaskType>(task: Task<T>) => {
		const id = tasks.addTask(task);
		const promise = tasks.getTaskPromise(id) as Promise<string>;
		promise.then((_result) => {
			setCompletedTasks((tasks) => [...tasks, id]);
		});
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
			<button
				onClick={() =>
					addTask({ name: "capitalize", request: { input } })
				}
			>
				Add Capitalize Task
			</button>
			<button
				onClick={() => addTask({ name: "reverse", request: { input } })}
			>
				Add Reverse Task
			</button>
			<button onClick={addWebWorker}>Add Web Worker</button>
			<div>
				<input
					type="text"
					value={apiEndpoint}
					onChange={(e) => setApiEndpoint(e.target.value)}
					placeholder={defaultEndpoint}
				/>
				<button onClick={addAPIWorker}>Add API Worker</button>
			</div>
			<div>
				<h2>Queue:</h2>
				<ul>
					{Array.from(queue).map(([id, task]) => (
						<li key={id}>
							Task {id.split("-")[0]}: {task.task.name}; Status:{" "}
							{QueuedTaskStatus[task.status]}{" "}
							{task.worker
								? `Assigned to ${task.worker.split("-")[0]}`
								: ""}{" "}
							{task.endTime
								? `${task.endTime - task.queuedTime}ms since queue, ${task.endTime - task.startTime!}ms compute`
								: ""}
						</li>
					))}
				</ul>
				<h2>Workers: {workers.size}</h2>
				<ul>
					{Array.from(workers).map(([id, worker]) => (
						<li key={id}>
							{worker.status} - {worker.message}
							<button onClick={() => removeWorker(id)}>
								Remove Worker
							</button>
							<button onClick={() => worker.requestJob()}>
								Request Job
							</button>
						</li>
					))}
				</ul>
				<h2>Output:</h2>
				{completedTasks.map((id) => {
					const task = queue.get(id);
					return (
						<p key={id}>
							{id.split("-")[0]}: {task?.task.response.result}
						</p>
					);
				})}
			</div>
		</div>
	);
}

export default App;
