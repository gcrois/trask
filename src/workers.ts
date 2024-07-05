// workers.ts

import { QueuedTaskStatus, TaskQueue, TaskQueueEvent } from "./queue";
import { v4 as uuid } from "uuid";
import { Task, TaskType } from "./types";
import { TaskRequest, TaskResponse } from "@proto/tasks";

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

	execute: <T extends TaskType>(
		task: Task<T>,
	) => Promise<Task<T>["response"]>;
	requestJob: () => boolean;
	setMessage: (message: string) => void;
	setStatus: (status: WorkerStatus) => void;
}

abstract class BaseWorker implements TWorker {
	public status: WorkerStatus = WorkerStatus.Idle;
	public message: string = "";

	readonly id: WorkerId = uuid();
	protected taskQueue: TaskQueue;

	constructor(taskQueue: TaskQueue) {
		this.taskQueue = taskQueue;
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

	// abstract execute<Input, Output>(task: TaskType<Input, Output>, input: Input): Promise<Output>;
	abstract execute<T extends TaskType>(
		task: Task<T>,
	): Promise<Task<T>["response"]>;

	requestJob(): boolean {
		if (
			!(
				this.status === WorkerStatus.Idle ||
				this.status === WorkerStatus.Waiting
			)
		) {
			console.warn(
				`Worker ${this.id} is not idle or waiting, but requested a job`,
			);
			return false;
		}

		console.log("Requesting job");
		const tasks = Array.from(this.taskQueue.getTasks());

		// find all queued tasks
		const queuedTasks = tasks.filter(([_id, task]) => {
			return task.status === QueuedTaskStatus.Queued;
		});

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
		console.log(`Executing task ${id.split("-")[0]}`, tasks);
		this.setStatus(WorkerStatus.Busy);

		this.execute(task.task)
			.then((result) => {
				task.resolve(result);
				this.setStatus(WorkerStatus.Waiting);
				this.requestJob();
			})
			.catch((error) => {
				task.reject(error);
				this.setStatus(WorkerStatus.Waiting);
				console.error(error);
			});

		return true;
	}
}

export class WebWorkerAdapter extends BaseWorker {
	private worker: Worker;

	constructor(worker: Worker, taskQueue: TaskQueue) {
		super(taskQueue);
		this.worker = worker;
	}

	async execute<T extends TaskType>(
		task: Task<T>,
	): Promise<Task<T>["response"]> {
		console.log("sending task to webworker", task);
		return await new Promise((resolve, reject) => {
			this.worker.onmessage = async (event) => {
				resolve(event.data);
			};
			this.worker.onerror = (error) => reject(error);
			this.worker.postMessage(task);
		});
	}
}

export class APIWorker extends BaseWorker {
	private handshakeUrl: string;
	private apiEndpoint: string;

	constructor(apiEndpoint: string, taskQueue: TaskQueue) {
		super(taskQueue);

		console.log("API Worker created with endpoint:", apiEndpoint);

		this.apiEndpoint = `${apiEndpoint}/execute`;
		this.handshakeUrl = `${apiEndpoint}/handshake`;

		this.handshake();
	}

	private async handshake() {
		try {
			const response = await fetch(this.handshakeUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ handshake: true }),
			});

			if (!response.ok) {
				throw new Error("Handshake failed");
			}

			const data = await response.json();
			console.log("Handshake successful:", data);
		} catch (error) {
			console.error("Handshake error:", error);
		}
	}

	async execute<T extends TaskType>(
		task: Task<T>,
	): Promise<Task<T>["response"]> {
		this.setStatus(WorkerStatus.Busy);
		this.setMessage(`Executing ${typeof task.name}`);
		console.log("sending task to api", task);

		try {
			const response = await fetch(this.apiEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					[task.name]: task.request,
				} as TaskRequest),
			});

			if (!response.ok) {
				throw new Error("API request failed");
			}

			const data = (await response.json()) as TaskResponse;

			this.setStatus(WorkerStatus.Waiting);
			this.setMessage("Waiting for task");
			return data[task.name];
		} catch (error) {
			this.setStatus(WorkerStatus.Paused);
			this.setMessage(`Error`);
			throw error;
		}
	}
}
