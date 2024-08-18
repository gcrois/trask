import React, { useState } from "react";
import { TaskQueue } from "@src/queue";
import { Task, TaskType } from "@src/types";
import { QueuedTask, QueuedTaskStatus } from "@src/queue";

interface TaskComponentProps {
	id: string;
	task: QueuedTask;
}

export const TaskComponent: React.FC<TaskComponentProps> = ({ id, task }) => {
	const getStatusColor = (status: QueuedTaskStatus) => {
		switch (status) {
			case QueuedTaskStatus.Queued:
				return "queued";
			case QueuedTaskStatus.Pending:
				return "in-progress";
			case QueuedTaskStatus.Resolved:
				return "completed";
			case QueuedTaskStatus.Rejected:
				return "failed";
			default:
				return "";
		}
	};

	const formatTime = (ms: number) => `${ms}ms`;

	return (
		<div className="task-card">
			<div className="task-info">
				<span className="task-id">Task {id.split("-")[0]}</span>
				<span className="task-name">{task.task.name}</span>
				<span className={`task-status ${getStatusColor(task.status)}`}>
					Status: {QueuedTaskStatus[task.status]}
				</span>
			</div>
			<div className="task-details">
				{task.worker && (
					<span className="task-worker">
						Assigned to: {task.worker.split("-")[0]}
					</span>
				)}
				{task.endTime && (
					<>
						<span className="task-time">
							Queue time:{" "}
							{formatTime(task.endTime - task.queuedTime)}
						</span>
						<span className="task-time">
							Compute time:{" "}
							{formatTime(task.endTime - task.startTime!)}
						</span>
					</>
				)}
			</div>
			{task.status === QueuedTaskStatus.Resolved &&
				task.task.response && (
					<div className="task-output">
						<span className="output-label">Output:</span>
						<span className="output-value">
							{task.task.response.result}
						</span>
					</div>
				)}
		</div>
	);
};

interface TasksComponentProps {
	queue: TaskQueue;
}

export const Tasks: React.FC<TasksComponentProps> = ({ queue }) => {
	const [input, setInput] = useState("");
	const [multiplyA, setMultiplyA] = useState("");
	const [multiplyB, setMultiplyB] = useState("");

	const addTask = <T extends TaskType>(task: Omit<Task<T>, "id">) => {
		queue.addTask(task);
	};

	return (
		<div>
			<h2>Add Tasks</h2>
			<div>
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Enter text"
				/>
				<button
					onClick={() =>
						addTask({
							name: "capitalize",
							request: { text: input },
						})
					}
				>
					Add Capitalize Task
				</button>
				<button
					onClick={() =>
						addTask({ name: "reverse", request: { input } })
					}
				>
					Add Reverse Task
				</button>
			</div>
			<div>
				<input
					type="number"
					value={multiplyA}
					onChange={(e) => setMultiplyA(e.target.value)}
					placeholder="Enter first number"
				/>
				<input
					type="number"
					value={multiplyB}
					onChange={(e) => setMultiplyB(e.target.value)}
					placeholder="Enter second number"
				/>
				<button
					onClick={() =>
						addTask({
							name: "multiply",
							request: {
								a: parseInt(multiplyA),
								b: parseInt(multiplyB),
							},
						})
					}
				>
					Add Multiply Task
				</button>
			</div>
		</div>
	);
};
