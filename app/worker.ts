import { localTasks, Task, TaskType } from "@src/types";

self.onmessage = async function<T extends keyof typeof localTasks>(e: any) {
	const { name, request } = e.data as Task<T>;
  
	if (name in localTasks) {
		const result = await localTasks[name].execute(request);
		self.postMessage(result);
	} else {
		console.error(`Task ${name} not found`, e.data);
		self.postMessage(`Task ${name} not found`);
	}
};