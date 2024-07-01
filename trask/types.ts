export interface TaskType<Input, Output> {
    name: string;
    execute: (input: Input) => Promise<Output>;
}

export const capitalizeText: TaskType<string, string> = {
	name: "capitalizeText",
	execute: async (input: string) => {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		return input.toUpperCase();
	}
};

export const reverseText: TaskType<string, string> = {
	name: "reverseText",
	execute: async (input: string) => {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		return input.split("").reverse().join("");
	}
};