// taskQueue.ts
import { Task, TaskType } from "@src/types";
import { TWorker, WorkerStatus } from "./workers";
import { v4 as uuid } from "uuid";

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
	TaskUpdate = "taskUpdate",
}

type QueueId = string;

export interface QueuedTask<
	T extends TaskType = any,
	Input = Task<T>["request"] & object,
	Output = Task<T>["response"] & object,
> {
	id: QueueId;
	timestamp: number;
	status: QueuedTaskStatus;
	worker?: string;
	task: Task<T>;
	queuedTime: number;
	startTime?: number;
	endTime?: number;
	externalPromise?: Promise<Output>;
	resolve: (value: Output | PromiseLike<Output>) => void;
	reject: (reason?: unknown) => void;
}

type TasksListener = (tasks: Map<string, QueuedTask>) => void;
type TaskUpdateListener = (taskId: string, update: any) => void;

export class TaskQueue {
	private tasks: Map<string, QueuedTask> = new Map();
	private workers: Map<string, TWorker> = new Map();
	private listeners: {
		[key: string]: (TasksListener | TaskUpdateListener)[];
	} = {};

	addWorker(worker: TWorker): void {
		this.workers.set(worker.id, worker);
		this.emit(TaskQueueEvent.WorkerChange);
	}

	removeWorker(workerId: string) {
		this.workers.delete(workerId);
		this.emit(TaskQueueEvent.WorkerChange);
	}

	getWorkers(): ReadonlyMap<string, TWorker> {
		return this.workers;
	}

	getTaskPromise(id: string): Promise<unknown> {
		const queuedTask = this.tasks.get(id);
		return queuedTask
			? queuedTask.externalPromise!
			: Promise.reject("Task not found");
	}

	addTask<
		T extends TaskType,
		Input = Task<T>["request"] & object,
		Output = Task<T>["request"],
	>(task: Task<T>): QueueId {
		const id = uuid();
		const timestamp = Date.now();
		const status = QueuedTaskStatus.Queued;
		const queuedTime = Date.now();

		let resolveExternal: (value: Output | PromiseLike<Output>) => void;
		let rejectExternal: (reason?: unknown) => void;
		const externalPromise = new Promise<Output>((resolve, reject) => {
			resolveExternal = resolve;
			rejectExternal = reject;
		});

		const promise = new Promise<Output>((resolve, reject) => {
			this.tasks.set(id, {
				id,
				timestamp,
				task: { ...task, id },
				resolve,
				reject,
				status,
				queuedTime,
				externalPromise,
			});
		});

		promise.then(
			(response) => {
				const queuedTask = this.tasks.get(id);
				if (queuedTask) {
					this.tasks.set(id, {
						...queuedTask,
						task: { ...task, id, response },
						status: QueuedTaskStatus.Resolved,
						endTime: Date.now(),
					});
					resolveExternal(response);
				}
				this.emit(TaskQueueEvent.QueueChange);
			},
			(error) => {
				const queuedTask = this.tasks.get(id);
				if (queuedTask) {
					this.tasks.set(id, {
						...queuedTask,
						status: QueuedTaskStatus.Rejected,
						endTime: Date.now(),
					});
					rejectExternal(error);
				}
				this.emit(TaskQueueEvent.QueueChange);
			},
		);

		this.emit(TaskQueueEvent.QueueChange);
		this.workers.forEach((worker) => {
			if (worker.status === WorkerStatus.Waiting) {
				worker.requestJob();
			}
		});

		return id;
	}

	assignTask(taskId: string, workerId: string) {
		const queuedTask = this.tasks.get(taskId);
		if (queuedTask && queuedTask.status === QueuedTaskStatus.Queued) {
			this.tasks.set(taskId, {
				...queuedTask,
				status: QueuedTaskStatus.Pending,
				worker: workerId,
				startTime: Date.now(),
			});
			this.emit(TaskQueueEvent.QueueChange);
		}
	}

	cancelTask(id: string) {
		const task = this.tasks.get(id);
		if (task) {
			this.tasks.set(id, { ...task, status: QueuedTaskStatus.Cancelled });
			this.emit(TaskQueueEvent.QueueChange);
		}
	}

	getTasks(): ReadonlyMap<string, QueuedTask> {
		return this.tasks;
	}

	handleIncrementalUpdate(taskId: string, update: any) {
		this.emit(TaskQueueEvent.TaskUpdate, taskId, update);
	}

	on(event: TaskQueueEvent, callback: TasksListener | TaskUpdateListener) {
		if (!this.listeners[event]) {
			this.listeners[event] = [];
		}
		this.listeners[event].push(callback);
	}

	off(event: TaskQueueEvent, callback: TasksListener | TaskUpdateListener) {
		if (this.listeners[event]) {
			this.listeners[event] = this.listeners[event].filter(
				(cb) => cb !== callback,
			);
		}
	}

	emit(event: TaskQueueEvent, ...args: any[]) {
		this.listeners[event]?.forEach((callback) => {
			if (event === TaskQueueEvent.TaskUpdate) {
				(callback as TaskUpdateListener)(args[0], args[1]);
			} else {
				(callback as TasksListener)(this.tasks);
			}
		});
	}
}
