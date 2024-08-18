import { FileReference, Task, TaskType } from "./types";
import { TWorker, WorkerStatus } from "./workers";
import { v4 as uuid } from "uuid";

export type QueueId = string;

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

export interface QueuedTask<T extends TaskType = TaskType> {
	id: QueueId;
	timestamp: number;
	status: QueuedTaskStatus;
	message?: string;
	worker?: string;
	task: Task<T>;
	queuedTime: number;
	startTime?: number;
	endTime?: number;
	externalPromise?: Promise<Task<T>["response"]>;
	resolve: (value: Task<T>["response"]) => void;
	reject: (reason?: unknown) => void;
}

type TasksListener = (tasks: Map<string, QueuedTask>) => void;
type TaskUpdateListener = <T extends TaskType = TaskType>(taskId: string, update: Task<T>["response"]) => void;

export class TaskQueue {
	private tasks: Map<string, QueuedTask> = new Map();
	private workers: Map<string, TWorker> = new Map();
	private listeners: {
		[key: string]: (TasksListener | TaskUpdateListener)[];
	} = {};
	private fileReferences: Map<string, Blob> = new Map();

	addFile(blob: Blob, fileId?: string): FileReference {
		const ref = {
			type: "file_reference" as const,
			id: fileId ?? uuid(),
			size: blob.size,
			hash: "hash",
		};

		this.fileReferences.set(ref.id, blob);

		return ref;
	}

	getFile(id: string): Blob | undefined {
		return this.fileReferences.get(id);
	}

	addWorker(worker: TWorker): void {
		this.workers.set(worker.id, worker);
		this.emit(TaskQueueEvent.WorkerChange);
	}

	removeWorker(workerId: string) {
		this.workers.get(workerId)?.dispose();
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

	addTask<T extends TaskType>(task: Omit<Task<T>, "id">): QueueId {
		const id = uuid();
		const timestamp = Date.now();
		const status = QueuedTaskStatus.Queued;
		const queuedTime = Date.now();

		let resolveExternal: (value: Task<T>["response"]) => void;
		let rejectExternal: (reason?: unknown) => void;
		const externalPromise = new Promise((resolve, reject) => {
			resolveExternal = resolve;
			rejectExternal = reject;
		}) as Promise<Task<T>["response"]>;

		const promise = new Promise((resolve, reject) => {
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
		}) as Promise<Task<T>["response"]>;

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
		this.notifyWorkers();
		return id;
	}

	private notifyWorkers() {
		this.workers.forEach((worker) => {
			worker.onAvailableTasksChange();
		});
	}

	getAvailableTasks(): QueuedTask[] {
		return Array.from(this.tasks.values())
			.filter((task) => task.status === QueuedTaskStatus.Queued)
			.sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp, newest first
	}

	getTask(id: string): QueuedTask | undefined {
		return this.tasks.get(id);
	}

	claimTask(taskId: string, workerId: string): boolean {
		const task = this.tasks.get(taskId);
		if (task && task.status === QueuedTaskStatus.Queued) {
			this.tasks.set(taskId, {
				...task,
				status: QueuedTaskStatus.Pending,
				worker: workerId,
				startTime: Date.now(),
			});
			this.emit(TaskQueueEvent.QueueChange);
			return true;
		}
		return false;
	}

	cancelTask(id: string) {
		const task = this.tasks.get(id);
		if (task) {
			this.tasks.set(id, { ...task, status: QueuedTaskStatus.Cancelled });
			this.emit(TaskQueueEvent.QueueChange);
		}
	}

	errorTask(id: string, error: string) {
		const task = this.tasks.get(id);
		if (task) {
			task.reject(error);
			this.emit(TaskQueueEvent.QueueChange);
		}
	}

	resolveTask<T extends TaskType>(id: string, response: Task<T>["response"]) {
		const task = this.tasks.get(id);
		if (task) {
			task.resolve(response);
			this.emit(TaskQueueEvent.QueueChange);
		}
	}

	getTasks(): ReadonlyMap<string, QueuedTask> {
		return this.tasks;
	}

	handleIncrementalUpdate<T extends TaskType>(taskId: string, update: Task<T>["response"]) {
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export function isFileReference(value: {type?: "file_reference"}): value is FileReference {
	return (
		value && typeof value === "object" && value.type === "file_reference"
	);
}
