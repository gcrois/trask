import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TaskQueue, QueuedTaskStatus, TaskQueueEvent } from "./queue";
import { APIWorker, WebWorkerAdapter, WorkerStatus } from "./workers";
import { Task } from "./types";

// Mock WebSocket
class MockWebSocket {
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
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

    it("should send available tasks when notified", () => {
        const task: Task<"testTask"> = {
            id: "1",
            name: "testTask",
            request: { test: "data" },
        };
        taskQueue.addTask(task);
        apiWorker.onAvailableTasksChange();
        expect((apiWorker as any).ws.send).toHaveBeenCalledWith(
            expect.stringContaining('"type":"available_tasks"'),
        );
    });

    it("should handle WebSocket messages correctly", () => {
        const ws = (apiWorker as any).ws;
        
        // Simulate 'result' message
        ws.onmessage({ data: JSON.stringify({ type: "result", result: "test result" }) });
        expect(apiWorker.status).toBe(WorkerStatus.Idle);

        // Simulate 'error' message
        ws.onmessage({ data: JSON.stringify({ type: "error", error: "test error" }) });
        expect(apiWorker.status).toBe(WorkerStatus.Idle);

        // Simulate 'accept_task' message
        const task = { name: "testTask", request: { test: "data" } };
        const taskId = taskQueue.addTask(task);
		console.log("taskQueue", taskQueue);
        ws.onmessage({ data: JSON.stringify({ type: "accept_task", taskId }) });
        expect(apiWorker.status).toBe(WorkerStatus.Busy);
    });

    it("should handle pause correctly", () => {
        apiWorker.pause();
        expect(apiWorker.status).toBe(WorkerStatus.Paused);
        expect((apiWorker as any).ws.send).toHaveBeenCalledWith(
            JSON.stringify({ type: "pause" })
        );
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