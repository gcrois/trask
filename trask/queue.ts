// taskQueue.ts

import { TaskType } from "./types";
import { TWorker, WorkerStatus } from "./workers";
import { v4 as uuid } from "uuid";

type TaskId = string;
type WorkerId = string;

export enum QueuedTaskStatus {
	Queued,
	Pending,
	Resolved,
	Rejected,
	Cancelled,
}

export enum TaskQueueEvent {
	QueueChange = "queueChange",
	WorkerChange = "workerChange",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface QueuedTask<Input = any, Output = any> {
	id: TaskId;
	timestamp: number;

	status: QueuedTaskStatus;
	worker?: WorkerId;

	task: TaskType<Input, Output>;
	input: Input;
	output?: Output;

	queuedTime: number;
	startTime?: number;
	endTime?: number;

	resolve: (value: Output | PromiseLike<Output>) => void;
	reject: (reason?: unknown) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// type Queue = QueuedTask<any, any>[];
type Tasks = Map<TaskId, QueuedTask>;
type TasksListener = (tasks: Tasks) => void;

export class TaskQueue {
	private tasks: Tasks = new Map();

	private workers: Map<WorkerId, TWorker> = new Map();
	private listeners: { [key: string]: TasksListener[] } = {};

	addWorker(worker: TWorker): void {
		this.workers.set(worker.id, worker);
		this.emit(TaskQueueEvent.WorkerChange);
	}

	removeWorker(worker: WorkerId) {
		if (!this.workers.delete(worker)) {
			console.error("Worker not found", worker);
		}
		this.emit(TaskQueueEvent.WorkerChange);
	}

	getWorkers(): ReadonlyMap<WorkerId, TWorker> {
		return this.workers;
	}

	addTask<Input, Output>(task: TaskType<Input, Output>, input: Input): TaskId {
		const id = uuid();
		const timestamp = Date.now();
		const status = QueuedTaskStatus.Queued;
		const queuedTime = Date.now();

		const promise = new Promise<Output>((resolve, reject) => {
			this.emit(TaskQueueEvent.QueueChange);
			this.tasks.set(id, { id, timestamp, task, input, resolve, reject, status, queuedTime });
		});

		promise.then(
			(result) => {
				const queuedTask = this.tasks.get(id);
				const endTime = Date.now();

				if (queuedTask) {
					this.tasks.set(id, { ...queuedTask, status: QueuedTaskStatus.Resolved, output: result, endTime });
				} else {
					console.error("Task not found", id);
				}
				this.emit(TaskQueueEvent.QueueChange);
			},
			(error) => {
				const queuedTask = this.tasks.get(id);
				const endTime = Date.now();

				if (queuedTask) {
					this.tasks.set(id, { ...queuedTask, status: QueuedTaskStatus.Rejected, output: error, endTime });
				} else {
					console.error("Task not found", id);
				}
				this.emit(TaskQueueEvent.QueueChange);
			}
		);

		this.emit(TaskQueueEvent.QueueChange);
		const workers = Array.from(this.workers.values());

		// ask waiting workers to pick up the task
		for (const worker of workers.filter(w => w.status === WorkerStatus.Waiting)) {
			if (worker.requestJob()) {
				break;
			}
		}

		return id;
	}

	assignTask(task: TaskId, worker: WorkerId) {
		const queuedTask = this.tasks.get(task);
		const startTime = Date.now();

		if (queuedTask) {
			if (queuedTask.status !== QueuedTaskStatus.Queued) {
				console.error("Task is not queued, but tried to be assigned", queuedTask);
				return;
			}
			this.tasks.set(task, { ...queuedTask, status: QueuedTaskStatus.Pending, worker, startTime });
			this.emit(TaskQueueEvent.QueueChange);
		} else {
			console.error("Task not found", task);
		}
	}

	cancelTask(id: TaskId) {
		this.tasks.set(id, { ...this.tasks.get(id)!, status: QueuedTaskStatus.Cancelled });
		this.emit(TaskQueueEvent.QueueChange);
	}

	getTasks(): ReadonlyMap<TaskId, QueuedTask> {
		return this.tasks;
	}

	on(event: TaskQueueEvent, callback: TasksListener) {
		if (!this.listeners[event]) {
			this.listeners[event] = [];
		}
		this.listeners[event].push(callback);
	}

	off(event: TaskQueueEvent, callback: TasksListener) {
		if (this.listeners[event]) {
			this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
		}
	}

	emit(event: string) {
		console.log("Emitting event", event);
		if (this.listeners[event]) {
			this.listeners[event].forEach(callback => callback(this.tasks));
		}
	}
}