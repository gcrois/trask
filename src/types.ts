import type { TaskRequest, TaskResponse } from "@proto/tasks";

export type TaskType = keyof TaskRequest & keyof TaskResponse;

export interface FileReference {
	type: "file_reference";
	id: string;
	size: number;
	hash: string;
}

export interface Task<T extends TaskType | unknown = unknown> {
	id: string;
	name: T;
	request: T extends TaskType ? TaskRequest[T] & object : object;
	response?: T extends TaskType ? TaskResponse[T] & object : object;
}
