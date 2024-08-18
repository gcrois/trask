import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TaskQueue, QueuedTaskStatus, TaskQueueEvent } from "./queue";
import { APIWorker, WebWorkerAdapter, WorkerStatus } from "./workers";
import { Task } from "./types";
import * as wsmsg from "@proto/websocket";
import { TaskRequest, TaskResponse } from "@proto/tasks";

// Mock WebSocket
class MockWebSocket {
	onopen: (() => void) | null = null;
	onmessage: ((event: { data: Uint8Array }) => void) | null = null;
	onclose: (() => void) | null = null;
	onerror: ((error: Event) => void) | null = null;
	send = vi.fn();
	close = vi.fn();
}

// Mock Worker
class MockWorker {
	onmessage: ((event: { data: any }) => void) | null = null;
	postMessage = vi.fn().mockImplementation((message) => {
		// Simulate worker responding immediately
		if (this.onmessage) {
			this.onmessage({
				data: {
					type: "result",
					taskId: message.task.id,
					result: { success: true },
				},
			});
		}
	});
	terminate = vi.fn();
	addEventListener = vi.fn((event, handler) => {
		if (event === "message") {
			this.onmessage = handler;
		}
	});
	removeEventListener = vi.fn();
}

describe("TaskQueue", () => {
	let taskQueue: TaskQueue;

	beforeEach(() => {
		taskQueue = new TaskQueue();
	});

	it("should add a task and return a task ID", () => {
		const task: Task<"testTask"> = {
			id: "1",
			name: "testTask",
			request: { test: "data" },
		};
		const taskId = taskQueue.addTask(task);
		expect(typeof taskId).toBe("string");
		expect(taskQueue.getTasks().size).toBe(1);
	});

	it("should return available tasks", () => {
		const task1: Task<"testTask"> = {
			id: "1",
			name: "testTask",
			request: { test: "data1" },
		};
		const task2: Task<"testTask"> = {
			id: "2",
			name: "testTask",
			request: { test: "data2" },
		};
		taskQueue.addTask(task1);
		taskQueue.addTask(task2);
		const availableTasks = taskQueue.getAvailableTasks();
		expect(availableTasks.length).toBe(2);
	});

	it("should allow claiming a task", () => {
		const task: Task<"testTask"> = {
			id: "1",
			name: "testTask",
			request: { test: "data" },
		};
		const taskId = taskQueue.addTask(task);
		const claimed = taskQueue.claimTask(taskId, "worker1");
		expect(claimed).toBe(true);
		const claimedTask = taskQueue.getTask(taskId);
		expect(claimedTask?.status).toBe(QueuedTaskStatus.Pending);
		expect(claimedTask?.worker).toBe("worker1");
	});

	it("should emit events when tasks are added or claimed", () => {
		const listener = vi.fn();
		taskQueue.on(TaskQueueEvent.QueueChange, listener);
		const task: Task<"testTask"> = {
			id: "1",
			name: "testTask",
			request: { test: "data" },
		};
		const taskId = taskQueue.addTask(task);
		expect(listener).toHaveBeenCalledTimes(1);
		taskQueue.claimTask(taskId, "worker1");
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("should handle file references", () => {
		const blob = new Blob(["test content"], { type: "text/plain" });
		const fileRef = taskQueue.addFile(blob);
		expect(fileRef.type).toBe("file_reference");
		expect(typeof fileRef.id).toBe("string");
		expect(fileRef.size).toBe(blob.size);

		const retrievedBlob = taskQueue.getFile(fileRef.id);
		expect(retrievedBlob).toEqual(blob);
	});
});

describe("APIWorker", () => {
	let taskQueue: TaskQueue;
	let apiWorker: APIWorker;

	beforeEach(() => {
		taskQueue = new TaskQueue();
		vi.stubGlobal("WebSocket", MockWebSocket);
		apiWorker = new APIWorker("ws://test.com", taskQueue);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("should initialize with Idle status", () => {
		expect(apiWorker.status).toBe(WorkerStatus.Idle);
	});

	it("should handle Greet task correctly", async () => {
		const task: Task<"greet"> = {
			id: "1",
			name: "greet",
			request: { name: "Alice", language: "en" } as TaskRequest,
		};
		const taskId = taskQueue.addTask(task);

		// Simulate available tasks notification
		apiWorker.onAvailableTasksChange();
		expect((apiWorker as any).ws.send).toHaveBeenCalled();
		const sentMessage = wsmsg.ClientMessage.decode(
			new Uint8Array((apiWorker as any).ws.send.mock.calls[0][0]),
		);
		expect(sentMessage.availableTasks).toBeDefined();
		expect(sentMessage.availableTasks?.tasks.length).toBe(1);

		// Simulate server accepting the task
		const acceptTaskMessage = wsmsg.ServerMessage.create({
			acceptTask: { taskId },
		});
		const encodedAcceptTask =
			wsmsg.ServerMessage.encode(acceptTaskMessage).finish();

		const ws = (apiWorker as any).ws;
		await ws.onmessage({ data: encodedAcceptTask });

		expect(apiWorker.status).toBe(WorkerStatus.Busy);

		// Simulate task completion
		const taskResultMessage = wsmsg.ServerMessage.create({
			taskResult: {
				taskId,
				result: { greeting: "Hello, Alice!" } as TaskResponse,
			},
		});
		const encodedTaskResult =
			wsmsg.ServerMessage.encode(taskResultMessage).finish();
		await ws.onmessage({ data: encodedTaskResult });

		expect(apiWorker.status).toBe(WorkerStatus.Idle);

		// Check if the task in the queue is marked as resolved
		const completedTask = taskQueue.getTask(taskId);
		expect(completedTask?.status).toBe(QueuedTaskStatus.Resolved);
	});

	it("should handle Greet task with different language", async () => {
		const task: Task<"greet"> = {
			id: "2",
			name: "greet",
			request: { name: "Maria", language: "es" } as TaskRequest,
		};
		const taskId = taskQueue.addTask(task);

		// Simulate server accepting the task
		const acceptTaskMessage = wsmsg.ServerMessage.create({
			acceptTask: { taskId },
		});
		const encodedAcceptTask =
			wsmsg.ServerMessage.encode(acceptTaskMessage).finish();

		const ws = (apiWorker as any).ws;
		await ws.onmessage({ data: encodedAcceptTask });

		// Simulate task completion
		const taskResultMessage = wsmsg.ServerMessage.create({
			taskResult: {
				taskId,
				result: { greeting: "Hola, Maria!" } as TaskResponse,
			},
		});
		const encodedTaskResult =
			wsmsg.ServerMessage.encode(taskResultMessage).finish();
		await ws.onmessage({ data: encodedTaskResult });

		expect(apiWorker.status).toBe(WorkerStatus.Idle);

		// Check if the task in the queue is marked as resolved
		const completedTask = taskQueue.getTask(taskId);
		expect(completedTask?.status).toBe(QueuedTaskStatus.Resolved);
	});

	it("should handle error messages correctly", async () => {
		const errorMessage = wsmsg.ServerMessage.create({
			error: {
				taskId: "3",
				error: "Test error message",
			},
		});
		const encodedError = wsmsg.ServerMessage.encode(errorMessage).finish();

		const ws = (apiWorker as any).ws;
		await ws.onmessage({ data: encodedError });

		// Check if the worker status remains Idle after an error
		expect(apiWorker.status).toBe(WorkerStatus.Idle);

		// You might want to add more specific expectations here,
		// such as checking if the task is marked as rejected in the queue
		const erroredTask = taskQueue.getTask("3");
		expect(erroredTask?.status).toBe(QueuedTaskStatus.Rejected);
	});
});

describe("WebWorkerAdapter", () => {
	let taskQueue: TaskQueue;
	let webWorker: WebWorkerAdapter;
	let mockWorker: MockWorker;

	beforeEach(() => {
		taskQueue = new TaskQueue();
		mockWorker = new MockWorker();
		webWorker = new WebWorkerAdapter(
			mockWorker as unknown as Worker,
			taskQueue,
		);
	});

	it("should handle available tasks change", async () => {
		const task: Task<"testTask"> = {
			name: "testTask",
			request: { test: "data" },
		};
		const taskId = taskQueue.addTask(task);

		await webWorker.onAvailableTasksChange();

		expect(mockWorker.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "execute",
				task: expect.objectContaining({
					name: "testTask",
				}),
			}),
		);

		const claimedTask = taskQueue.getTask(taskId);
		expect(claimedTask?.status).toBe(QueuedTaskStatus.Pending);
		expect(claimedTask?.worker).toBe(webWorker.id);
	});

	it("should handle incremental updates from Worker", () => {
		const updateListener = vi.fn();
		taskQueue.on(TaskQueueEvent.TaskUpdate, updateListener);
		const task: Task<"testTask"> = {
			id: "1",
			name: "testTask",
			request: { test: "data" },
		};
		taskQueue.addTask(task);

		if (mockWorker.onmessage) {
			mockWorker.onmessage({
				data: {
					type: "incrementalUpdate",
					taskId: task.id,
					update: "test update",
				},
			});
		}

		expect(updateListener).toHaveBeenCalledWith(task.id, "test update");
	});

	it("should dispose correctly", () => {
		webWorker.dispose();
		expect(mockWorker.terminate).toHaveBeenCalled();
	});
});
