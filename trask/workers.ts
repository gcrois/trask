// workers.ts

import { TaskType } from "./types";
import { QueuedTaskStatus, TaskQueue, TaskQueueEvent } from "./queue";

import { v4 as uuid } from "uuid";

export type WorkerId = string;

export enum WorkerStatus {
    Idle = "Idle",
	Waiting = "Waiting",
    Busy = "Busy",
	Paused = "Paused",
}

export interface TWorker {
    id: WorkerId;
    status: WorkerStatus;
    message: string;

	onRemove(): void;

    execute: <Input, Output>(task: TaskType<Input, Output>, input: Input) => Promise<Output>;
    requestJob: () => boolean;
}

// export class APIWorker implements TWorker {
// 	public status: WorkerStatus = WorkerStatus.Idle;
// 	public message: string = "not implemented";
// 	private taskQueue: TaskQueue;

// 	constructor(private apiEndpoint: string, taskQueue: TaskQueue) {
// 		this.taskQueue = taskQueue;
// 	}

// 	async execute<Input, Output>(task: TaskType<Input, Output>, input: Input): Promise<Output> {
// 		this.status = WorkerStatus.Busy;
// 		try {
// 			const response = await fetch(this.apiEndpoint, {
// 				method: "POST",
// 				headers: { "Content-Type": "application/json" },
// 				body: JSON.stringify({ task: task.name, input }),
// 			});
// 			await this.delay(1000); // 1 second delay
// 			const result = await response.json();
// 			return result;
// 		} finally {
// 			this.status = WorkerStatus.Idle;
// 			this.requestJob();
// 		}
// 	}

// 	requestJob() {
// 		if (this.status === WorkerStatus.Idle) {
// 			this.taskQueue.assignJobToWorker(this);
// 		}
// 	}

// 	private delay(ms: number): Promise<void> {
// 		return new Promise(resolve => setTimeout(resolve, ms));
// 	}
// }

export class WebWorkerAdapter implements TWorker {
	public status: WorkerStatus = WorkerStatus.Idle;
	public message: string = "";

	readonly id: WorkerId = uuid();

	private worker: Worker;
	private taskQueue: TaskQueue;
	private reqLoop = this.requestJob.bind(this);

	constructor(worker: Worker, taskQueue: TaskQueue) {
		this.worker = worker;
		this.taskQueue = taskQueue;
	}

	onRemove() {
		this.taskQueue.off(TaskQueueEvent.QueueChange, this.reqLoop);
	}

	setMessage(message: string) {
		console.log(`Worker ${this.id}: ${message}`);
		this.message = message;
		this.taskQueue.emit(TaskQueueEvent.WorkerChange);
	}

	setStatus(status: WorkerStatus) {
		console.log(`Worker ${this.id}: ${WorkerStatus[status]}`);
		this.status = status;
		this.taskQueue.emit(TaskQueueEvent.WorkerChange);
	}

	async execute<Input, Output>(task: TaskType<Input, Output>, input: Input): Promise<Output> {
		return await new Promise((resolve, reject) => {
			this.worker.onmessage = async (event) => {
				resolve(event.data);
			};
			this.worker.onerror = (error) => reject(error);
			this.worker.postMessage({ task: task.name, input });
		});
	}

	requestJob() {
		if (!(this.status === WorkerStatus.Idle || this.status === WorkerStatus.Waiting)) {
			console.warn(`Worker ${this.id} is not idle or waiting, but requested a job`);
			return false;
		}

		console.log("Requesting job");
		const tasks = Array.from(this.taskQueue.getTasks());

		// find all queued tasks
		const queuedTasks = tasks.filter(([_id, task]) => task.status === QueuedTaskStatus.Queued);

		// if no tasks, listen once for queue change
		if (queuedTasks.length === 0) {
			console.log("No tasks, waiting for tasks");
			this.setMessage("Waiting for tasks");
			this.setStatus(WorkerStatus.Waiting);
			return false;
		}

		// sort by timestamp
		queuedTasks.sort((a, b) => a[1].timestamp - b[1].timestamp);

		// assign first task to worker
		const [id, task] = queuedTasks[0];
		this.taskQueue.assignTask(id, this.id);

		// execute the task
		this.setMessage(`Executing ${task.task.name} (${id.split("-")[0]})`);
		this.setStatus(WorkerStatus.Busy);

		this.execute(task.task, task.input)
			.then(result => {
				task.resolve(result);
				this.setStatus(WorkerStatus.Waiting);
				this.requestJob();
			})
			.catch(error => {
				task.reject(error);
				this.setStatus(WorkerStatus.Waiting);
				console.error(error);
			});
		
		return true;
	}
}