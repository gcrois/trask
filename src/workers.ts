import {
	AssetEntry,
	assetEntryToBase64,
	base64ToBlob,
	QueuedTask,
	QueuedTaskStatus,
	TaskQueue,
	TaskQueueEvent,
} from "./queue";
import { v4 as uuid } from "uuid";
import { Task, TaskType } from "./types";
import { TaskRequest, TaskResponse } from "../proto/ts/tasks"; //"@proto/tasks";
import * as wsmsg from "../proto/ts/websocket";

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
					"incremental update",
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
}

const VERBOSE = true; // Set this to false to disable verbose printing

function verbosePrint(action: string, message: unknown) {
	if (!VERBOSE) return;

	const timestamp = new Date().toISOString();
	let out = "";
	out += `[${timestamp}] ${action}\n`;

	if (message instanceof Uint8Array) {
		out += `Raw bytes (length: ${message.length}): ${message.slice(0, 20)}...\n`;
	} else if (typeof message === "object") {
		out += JSON.stringify(message, null, 2) + "\n";
	} else {
		out += message + "\n";
	}

	out += "------------------";
	console.trace(out);
}

export class APIWorker extends BaseWorker {
	private ws: WebSocket;
	private handshaked: boolean = false;

	constructor(wsEndpoint: string, taskQueue: TaskQueue) {
		super(taskQueue);
		this.setStatus(WorkerStatus.Paused);
		this.setMessage("Connecting to server...");

		this.ws = new WebSocket(new URL(this.id, wsEndpoint));

		this.ws.onopen = () => {
			verbosePrint("WebSocket connection established", this.id);
			// send handshake, expecting a handshake response
			this.ws.send(
				wsmsg.ClientMessage.encode({
					handshake: { version: "0.0.0" },
				}).finish(),
			);
			this.setMessage("Connected to server");
			this.setStatus(WorkerStatus.Idle);
		};

		this.ws.onmessage = async (event) => {
			let arrayBuffer: ArrayBuffer;
			if (event.data instanceof ArrayBuffer) {
				arrayBuffer = event.data;
			} else if (event.data instanceof Blob) {
				arrayBuffer = await event.data.arrayBuffer();
			} else {
				verbosePrint(
					"Unexpected data type received",
					typeof event.data,
				);
				return;
			}

			const message = wsmsg.ServerMessage.decode(
				new Uint8Array(arrayBuffer),
			);
			verbosePrint("Decoded ServerMessage", message);

			if (!this.handshaked) {
				if (message.handshake) {
					verbosePrint(
						"Received handshake response",
						message.handshake,
					);
					this.handshaked = true;
				} else {
					verbosePrint(
						"Received unexpected message before handshake",
						message,
					);
					this.setMessage("Unexpected message before handshake");
					this.setStatus(WorkerStatus.Error);
					this.ws.close();
					return;
				}
			}

			if (message.incrementalUpdate) {
				verbosePrint(
					"Received incremental update",
					message.incrementalUpdate,
				);
				const task = this.taskQueue.getTask(
					message.incrementalUpdate.taskId,
				);
				this.taskQueue.handleIncrementalUpdate(
					message.incrementalUpdate.taskId,
					message.incrementalUpdate.msg,
					message.incrementalUpdate.update![
						task?.task.name || "text2text"
					],
				);
			} else if (message.taskResult) {
				verbosePrint("Received task result", message.taskResult);
				this.taskQueue.resolveTask(
					message.taskResult.taskId,
					message.taskResult.result as Task<TaskType>["response"],
				);
				this.setMessage(`Task ${message.taskResult.taskId} resolved`);
				this.setStatus(WorkerStatus.Idle);

				// ask for available tasks
				this.onAvailableTasksChange();
			} else if (message.error) {
				verbosePrint("Received error", message.error);
				this.taskQueue.errorTask(
					message.error.taskId,
					message.error.error,
				);
				this.setMessage(`Task ${message.error.taskId} failed`);
				this.setStatus(WorkerStatus.Idle);

				// ask for available tasks
				this.onAvailableTasksChange();
			} else if (message.acceptTask) {
				verbosePrint(
					"Received accept_task message",
					message.acceptTask,
				);
				const task = this.taskQueue.getTask(message.acceptTask.taskId);
				if (task && task.status === QueuedTaskStatus.Queued) {
					this.taskQueue.claimTask(
						message.acceptTask.taskId,
						this.id,
					);
					this.setStatus(WorkerStatus.Busy);
					this.setMessage(`Executing ${task.task.name}`);

					console.log("Executing task", task.task);
					this.execute(task.task);
				} else {
					verbosePrint(
						"Task not available",
						message.acceptTask.taskId,
					);
				}
			} else if (message.fileRequest) {
				verbosePrint("Received file request", message.fileRequest);
				const file = await this.taskQueue.getFile(
					message.fileRequest.fileId,
				);
				if (file) {
					const content = await assetEntryToBase64(file);
					const response = wsmsg.ClientMessage.create({
						fileResponse: {
							fileId: file.id,
							content: content,
						},
					});
					verbosePrint("Sending file response", response);
					this.ws.send(wsmsg.ClientMessage.encode(response).finish());
				}
			} else if (message.fileSend) {
				verbosePrint("Received file send", message.fileSend);
				const { fileId, content } = message.fileSend;
				const blob = base64ToBlob(content);

				this.taskQueue.addAssetEntry({
					id: fileId as AssetEntry["id"],
					file: blob,
					size: blob.size,
					hash: "hash",
				})

				// send file received response
				const response = wsmsg.ClientMessage.create({
					fileReceive: { fileId },
				});
				console.log("Sending file received response", response);
				this.ws.send(wsmsg.ClientMessage.encode(response).finish());
			} else if (message.requestAvailableTasks) {
				verbosePrint(
					"Received request for available tasks",
					message.requestAvailableTasks,
				);
				this.onAvailableTasksChange(true);
			}
		};

		this.ws.onclose = (ev) => {
			verbosePrint("WebSocket connection closed", this.id);
			this.setStatus(WorkerStatus.Error);
			this.setMessage(`Connection closed -- ${ev.reason || ev.code}`);
		};

		this.ws.onerror = (error) => {
			verbosePrint("WebSocket error", error);
			this.setMessage(`Connection error: ${error}`);
		};
	}

	onAvailableTasksChange(force = false): void {
		if (
			(!force && this.status === WorkerStatus.Busy) ||
			this.status === WorkerStatus.Paused
		) {
			return;
		}

		const availableTasks = this.taskQueue.getAvailableTasks();
		verbosePrint("Available tasks", availableTasks);

		const transpose = {
			availableTasks: {
				tasks: availableTasks.map((queuedTask) => ({
					id: queuedTask.id,
					name: queuedTask.task.name,
					request: queuedTask.task.request,
				})),
			},
		};

		console.log("Sending available tasks transpose", transpose);

		const message = wsmsg.ClientMessage.create({
			availableTasks: {
				tasks: availableTasks.map((queuedTask) => ({
					id: queuedTask.id,
					name: queuedTask.task.name,
					request: {
						[queuedTask.task.name]: queuedTask.task.request,
					} as TaskRequest,
				})),
			},
		});
		console.log(message.availableTasks?.tasks.map((task) => task));

		verbosePrint("Sending available tasks", message);
		this.ws.send(wsmsg.ClientMessage.encode(message).finish());
	}

	async execute<T extends TaskType>(task: Task<T>) {
		this.setStatus(WorkerStatus.Busy);
		this.setMessage(`Executing ${task.name}`);

		const message = wsmsg.ClientMessage.create({
			execute: {
				taskId: task.id,
				name: task.name,
				// @ts-expect-error TS doesn't like this
				request: { [task.name]: task.request },
			},
		});
		verbosePrint("Executing task", message);
		this.ws.send(wsmsg.ClientMessage.encode(message).finish());
	}

	pause() {
		const message = wsmsg.ClientMessage.create({
			pause: {},
		});
		verbosePrint("Pausing worker", this.id);
		this.ws.send(wsmsg.ClientMessage.encode(message).finish());
		this.setStatus(WorkerStatus.Paused);
	}

	resume() {
		const message = wsmsg.ClientMessage.create({
			resume: {},
		});
		verbosePrint("Resuming worker", this.id);
		this.ws.send(wsmsg.ClientMessage.encode(message).finish());
		this.setStatus(WorkerStatus.Idle);
	}

	dispose = () => {
		verbosePrint("Disposing API worker!", this.id);
		try {
			this.ws.close(1000, "Worker disposed");
		} catch (e) {
			console.error("Error closing WebSocket", e);
		}
	};
}
