import { capitalizeText, reverseText } from "../trask/types";

const tasks = {
	[capitalizeText.name]: capitalizeText.execute,
	[reverseText.name]: reverseText.execute,
};

self.onmessage = async function(e) {
	const { task, input } = e.data;
  
	if (task in tasks) {
		const result = await tasks[task](input);
		self.postMessage(result);
	} else {
		self.postMessage("Unknown task");
	}
};