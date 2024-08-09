// workers.ts

import { QueuedTaskStatus, TaskQueue, TaskQueueEvent } from "./queue";
import { v4 as uuid } from "uuid";
import { Task, TaskType } from "./types";
import { TaskRequest, TaskResponse } from "@proto/tasks";

export type WorkerId = string;

console.log("worker.ts");

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

		const queuedTasks = tasks.filter(([_id, task]) => {
			return task.status === QueuedTaskStatus.Queued;
		});

		if (queuedTasks.length === 0) {
			console.log("No tasks, waiting for tasks");
			this.setMessage("Waiting for tasks");
			this.setStatus(WorkerStatus.Waiting);
			return false;
		}

		queuedTasks.sort((a, b) => a[1].timestamp - b[1].timestamp);

		const [id, task] = queuedTasks[0];
		this.taskQueue.assignTask(id, this.id);

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

		this.worker.onmessage = (event) => {
			if (event.data.type === "incrementalUpdate") {
				this.taskQueue.handleIncrementalUpdate(
					event.data.taskId,
					event.data.update,
				);
			}
		};
	}

	async execute<T extends TaskType>(
		task: Task<T>,
	): Promise<Task<T>["response"]> {
		console.log("sending task to webworker", task);
		return await new Promise((resolve, reject) => {
			const messageHandler = (event: MessageEvent) => {
				if (
					event.data.type === "result" &&
					event.data.taskId === task.id
				) {
					this.worker.removeEventListener("message", messageHandler);
					resolve(event.data.result);
				}
			};

			this.worker.addEventListener("message", messageHandler);
			this.worker.addEventListener("error", (error) => reject(error), {
				once: true,
			});

			this.worker.postMessage({ type: "execute", task });
		});
	}
}

export class APIWorker extends BaseWorker {
	private ws: WebSocket;
	private taskPromises: Map<string, { resolve: Function; reject: Function }> =
		new Map();

	constructor(wsEndpoint: string, taskQueue: TaskQueue) {
		super(taskQueue);
		this.ws = new WebSocket(wsEndpoint);

		this.ws.onopen = () => {
			console.log("WebSocket connection established");
			this.setStatus(WorkerStatus.Idle);
		};

		this.ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (message.type === "incrementalUpdate") {
				this.taskQueue.handleIncrementalUpdate(
					message.taskId,
					message.update,
				);
			} else if (message.type === "result") {
				const promise = this.taskPromises.get(message.taskId);
				if (promise) {
					promise.resolve(message.result);
					this.taskPromises.delete(message.taskId);
				}
			} else if (message.type === "error") {
				const promise = this.taskPromises.get(message.taskId);
				if (promise) {
					promise.reject(new Error(message.error));
					this.taskPromises.delete(message.taskId);
				}
			}
		};

		this.ws.onclose = () => {
			console.log("WebSocket connection closed");
			this.setStatus(WorkerStatus.Paused);
		};

		this.ws.onerror = (error) => {
			console.error("WebSocket error:", error);
			this.setStatus(WorkerStatus.Paused);
		};
	}

	async execute<T extends TaskType>(
		task: Task<T>,
	): Promise<Task<T>["response"]> {
		this.setStatus(WorkerStatus.Busy);
		this.setMessage(`Executing ${task.name}`);
		console.log("sending task to api", task);

		return new Promise((resolve, reject) => {
			this.taskPromises.set(task.id, { resolve, reject });
			this.ws.send(
				JSON.stringify({
					type: "execute",
					taskId: task.id,
					name: task.name,
					request: task.request,
				}),
			);
		});
	}
}
