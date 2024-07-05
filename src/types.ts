import type {
	TaskRequest,
	TaskResponse,
	CapitalizeTextRequest,
	ReverseTextRequest,
} from "@proto/tasks";

export type TaskType = keyof TaskRequest & keyof TaskResponse;
export interface Task<T extends TaskType> {
	name: T;
	request: TaskRequest[T] & object;
	response?: TaskResponse[T] & object;
}

export interface LocalTask<T extends TaskType> {
	execute: (request: TaskRequest[T] & object) => Promise<TaskResponse[T]>;
}

export type CapitalizeText = Task<"capitalize">;
export const capitalizeText: LocalTask<"capitalize"> = {
	execute: async (request: CapitalizeTextRequest) => {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		return { result: request!.input.toUpperCase() };
	},
};

export type ReverseText = Task<"reverse">;
export const reverseText: LocalTask<"reverse"> = {
	execute: async (request: ReverseTextRequest) => {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		return { result: request!.input.split("").reverse().join("") };
	},
};

export const localTasks = {
	capitalize: capitalizeText,
	reverse: reverseText,
};
