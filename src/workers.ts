import {
	QueuedTask,
	QueuedTaskStatus,
	TaskQueue,
	TaskQueueEvent,
} from "./queue";
import { v4 as uuid } from "uuid";
import { Task, TaskType } from "./types";
import { TaskRequest, TaskResponse } from "@proto/tasks";

export type WorkerId = string;

export enum WorkerStatus {
	Idle = "Idle",
	Busy = "Busy",
	Paused = "Paused",
	Error = "Error",
}

export interface TWorker {
	id: WorkerId;
	status: WorkerStatus;
	message: string;

	onAvailableTasksChange: () => void;
	setMessage: (message: string) => void;
	setStatus: (status: WorkerStatus) => void;
	dispose: () => void;
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

	abstract dispose: () => void;

	abstract onAvailableTasksChange(): void;
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

	async onAvailableTasksChange(): Promise<void> {
		if (this.status !== WorkerStatus.Idle) {
			return;
		}

		const availableTasks = this.taskQueue.getAvailableTasks();
		if (availableTasks.length === 0) {
			this.setStatus(WorkerStatus.Idle);
			return;
		}

		const task = availableTasks[0];
		const claimed = this.taskQueue.claimTask(task.id, this.id);
		if (claimed) {
			await this.execute(task.task);
			this.setStatus(WorkerStatus.Idle);
		}
	}

	async execute<T extends TaskType>(
		task: Task<T>,
	): Promise<Task<T>["response"]> {
		this.setStatus(WorkerStatus.Busy);

		this.setMessage(`Executing ${task.name}`);
		console.log("sending task to webworker", task);

		return new Promise((resolve, reject) => {
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

	dispose = () => {
		console.log(`Disposing webworker ${this.id}`);
		this.worker.terminate();
	};

	protected selectSuitableTask(tasks: QueuedTask[]): QueuedTask | null {
		// Default implementation: select the first available task
		return tasks[0] || null;
	}
}

const blobToBase64 = (blob: Blob) => {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.readAsDataURL(blob);
		reader.onloadend = function () {
			resolve(reader.result);
		};
	});
};

export class APIWorker extends BaseWorker {
	private ws: WebSocket;
	private taskPromises: Map<
		string,
		{ resolve: (value: any) => void; reject: (reason?: any) => void }
	> = new Map();

	constructor(wsEndpoint: string, taskQueue: TaskQueue) {
		super(taskQueue);
		this.ws = new WebSocket(new URL(this.id, wsEndpoint));

		this.ws.onopen = () => {
			console.log("WebSocket connection established");
			this.setStatus(WorkerStatus.Idle);
		};

		this.ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (message.type === "incrementalUpdate") {
				console.log("Received incremental update", message);
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
			} else if (message.type === "get_available_tasks") {
				const tasks = this.taskQueue.getAvailableTasks();
				this.ws.send(
					JSON.stringify({
						type: "available_tasks",
						tasks: tasks.map((task) => task.task),
					}),
				);
			} else if (message.type === "file_request") {
				const file = this.taskQueue.getFile(message.fileId);
				if (file) {
					this.ws.send(
						JSON.stringify({
							type: "file_response",
							fileId: message.fileId,
							content: blobToBase64(file),
						}),
					);
				}
			} else if (message.type === "accept_task") {
				const task = this.taskQueue.getTask(message.taskId);
				console.log("Received accept_task message", message, task, task!.status);
				// verify that the task is still available
				if (task && task.status === QueuedTaskStatus.Queued) {
					this.taskQueue.claimTask(message.taskId, this.id);
					this.setStatus(WorkerStatus.Busy);
					this.ws.send(
						JSON.stringify({
							type: "accept_task_valid",
							taskId: message.taskId,
						}),
					);
				}
				else {
					console.error(`Task ${message.taskId} is not available`);
					this.ws.send(
						JSON.stringify({
							type: "accept_task_invalid",
							taskId: message.taskId,
						}),
					);
				}
			}
		};

		this.ws.onclose = () => {
			console.log("WebSocket connection closed");
			this.setStatus(WorkerStatus.Error);
			this.setMessage("Connection closed");
		};

		this.ws.onerror = (error) => {
			console.error("WebSocket error:", error);
			this.setMessage(`Connection error: ${error}`);
		};
	}

	onAvailableTasksChange(): void {
		if (this.status !== WorkerStatus.Idle) {
			return;
		}

		const availableTasks = this.taskQueue.getAvailableTasks();

		this.ws.send(
			JSON.stringify({
				type: "available_tasks",
				tasks: availableTasks.map((task) => task.task),
			}),
		);
	}

	pause() {
		this.ws.send(JSON.stringify({ type: "pause" }));
		this.setStatus(WorkerStatus.Paused);
	}

	dispose = () => {
		console.log(`Disposing API worker ${this.id}`);
		this.ws.close();
	};
}
