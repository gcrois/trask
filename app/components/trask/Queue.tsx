import React, { useState, useEffect } from "react";
import {
	TaskQueue,
	TaskQueueEvent,
	QueuedTask,
	QueuedTaskStatus,
} from "@src/queue";
import { TaskComponent } from "./Task";

interface QueueComponentProps {
	queue: TaskQueue;
}

export const Queue: React.FC<QueueComponentProps> = ({ queue }) => {
	const [queuedTasks, setQueuedTasks] = useState<
		ReadonlyMap<string, QueuedTask>
	>(queue.getTasks());
	const [completedTasks, setCompletedTasks] = useState<string[]>([]);

	useEffect(() => {
		const updateQueue = () => setQueuedTasks(new Map(queue.getTasks()));
		queue.on(TaskQueueEvent.QueueChange, updateQueue);

		return () => {
			queue.off(TaskQueueEvent.QueueChange, updateQueue);
		};
	}, []);

	useEffect(() => {
		const checkCompletedTasks = () => {
			const newCompletedTasks = Array.from(queuedTasks.entries())
				.filter(
					([_, task]) => task.status === QueuedTaskStatus.Resolved,
				)
				.map(([id]) => id);
			setCompletedTasks(newCompletedTasks);
		};

		checkCompletedTasks();
	}, [queuedTasks]);

	return (
		<div>
			<h2>Queue:</h2>
            {Array.from(queuedTasks.entries()).map(([id, task]) => {
                if (task.status === QueuedTaskStatus.Resolved) {
                    return null;
                }
                return <TaskComponent key={id} id={id} task={task} />;
            })}

			<h2>Output:</h2>
			{completedTasks.map((id) => {
				const task = queuedTasks.get(id);
				return <TaskComponent key={id} id={id} task={task!} />;
			})}
		</div>
	);
};
