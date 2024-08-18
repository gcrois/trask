import { APIWorker, TWorker, WebWorkerAdapter, WorkerId } from "@src/workers";
import TestWorker from "./worker?worker";
import { TaskQueue, TaskQueueEvent } from "@src/queue";
import React, { useEffect, useState } from "react";

interface WorkerComponentProps {
	id: WorkerId;
	worker: TWorker;
	onRemove: (id: WorkerId) => void;
	onRequestJob: () => void;
}

export const WorkerComponent: React.FC<WorkerComponentProps> = ({
	id,
	worker,
	onRemove,
	onRequestJob,
}) => {
	return (
		<div className="worker-card">
			<div className="worker-info">
				<span className="worker-id">Worker {id.split("-")[0]}</span>
				<span
					className={`worker-status ${worker.status.toLowerCase()}`}
				>
					Status: {worker.status}
				</span>
				<span
					className={`worker-message`}
				>
					{worker.message}
				</span>
			</div>
			<div className="worker-actions">
				<button onClick={() => onRemove(id)}>Remove Worker</button>
				<button onClick={onRequestJob}>Request Job</button>
			</div>
		</div>
	);
};

interface WorkersComponentProps {
	queue: TaskQueue;
}

export const Workers: React.FC<WorkersComponentProps> = ({ queue }) => {
	const [workers, setWorkers] = useState<ReadonlyMap<string, TWorker>>(
		queue.getWorkers(),
	);

	useEffect(() => {
		const updateWorkers = () => setWorkers(new Map(queue.getWorkers()));

		queue.on(TaskQueueEvent.WorkerChange, updateWorkers);

		return () => {
			queue.off(TaskQueueEvent.WorkerChange, updateWorkers);
		};
	}, []);

	const [endpoint, setEndpoint] = useState("");

	const addWebWorker = () => {
		const newWorker = new WebWorkerAdapter(new TestWorker(), queue);
		queue.addWorker(newWorker);
	};

	const addAPIWorker = (endpoint: string) => {
		const newWorker = new APIWorker(endpoint, queue);
		queue.addWorker(newWorker);
	};

	const removeWorker = (id: WorkerId) => {
		queue.removeWorker(id);
	};

	return (
		<div>
			<button onClick={addWebWorker}>Add Web Worker</button>
			<hr />
			<button onClick={() => addAPIWorker(endpoint)}>
				Add API Worker
			</button>
			<input
				type="text"
				onChange={(e) => setEndpoint(e.target.value)}
				placeholder="API Worker Endpoint"
			/>
			<h2>Workers: {queue.getWorkers().size}</h2>
			<ul
				css={{
					listStyle: "none",
					padding: 0,
					margin: 0,
					maxHeight: "100%",
					overflowY: "auto",
				}}
			>
				{Array.from(queue.getWorkers()).map(([id, worker]) => (
					<WorkerComponent
						key={id}
						id={id}
						worker={worker}
						onRemove={removeWorker}
					/>
					// <li key={id}>
					// 	Worker {id.split("-")[0]} - Status: {worker.status}
					// 	<button onClick={() => removeWorker(id)}>
					// 		Remove Worker
					// 	</button>
					// 	<button onClick={() => worker.requestJob()}>
					// 		Request Job
					// 	</button>
					// </li>
				))}
			</ul>
		</div>
	);
};
