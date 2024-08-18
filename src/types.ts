import type { TaskRequest, TaskResponse } from "../proto/ts/tasks";
//"@proto/tasks";

export type TaskType = keyof TaskRequest & keyof TaskResponse;

export interface FileReference {
	type: "file_reference";
	id: string;
	size: number;
	hash: string;
}

export interface Task<T extends TaskType> {
	id: string;
	name: T;
	request: TaskRequest[T];
	response?: TaskResponse[T];
}

export interface AnyTask {
	id: string;
	name: string;
	request: object;
	response?: object;
}
