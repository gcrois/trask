from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
import json
import argparse
from typing import Dict, List, Type, Set
from datetime import datetime
import atexit
import importlib
import asyncio

from tasks.task import Task, File

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from proto.py import tasks as proto_tasks  # type: ignore

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_connections: Dict[str, WebSocket] = {}
request_logs: List[Dict] = []
TASKS: Dict[str, Type[Task]] = {}
loaded_tasks: Set[str] = set()
available_files: Set[str] = set()

def dump_logs():
    dumps_dir = os.path.join(os.path.dirname('.'), 'dumps')
    os.makedirs(dumps_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_logs.json"
    filepath = os.path.join(dumps_dir, filename)
    with open(filepath, 'w') as f:
        json.dump(request_logs, f, indent=2, default=str)
    print(f"Logs dumped to {filepath}")

atexit.register(dump_logs)

def load_tasks(task_names: List[str] = []):
    global TASKS
    tasks_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend/tasks')
    sys.path.append(tasks_dir)
    
    for filename in os.listdir(tasks_dir):
        if filename.endswith('.py') and filename != '__init__.py':
            module_name = filename[:-3]
            module = importlib.import_module(module_name)
            for name, obj in module.__dict__.items():
                if isinstance(obj, type) and issubclass(obj, Task) and obj != Task:
                    if not task_names or name in task_names:
                        TASKS[name] = obj
                        print(f"Loaded task: {name}")

def select_task(available_tasks: List[Dict]):
    # Prioritize tasks that are already loaded and have all required files
    for task in available_tasks:
        task_name = task['name']
        if task_name in loaded_tasks:
            task_files = set(file['id'] for file in task.get('files', []))
            if task_files.issubset(available_files):
                return task

    # If no loaded task is suitable, choose the first available task
    return available_tasks[0] if available_tasks else None

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    print(f"Client {client_id} connected, active connections: {len(active_connections)}")
    
    try:
        while True:
            data = await websocket.receive_json()
            if data['type'] == 'available_tasks':
                available_tasks = data['tasks']
                selected_task = select_task(available_tasks)
                if selected_task:
                    await websocket.send_json({
                        'type': 'accept_task',
                        'taskId': selected_task['id']
                    })
                else:
                    await websocket.send_json({
                        'type': 'no_task_available'
                    })
            elif data['type'] == 'execute':
                task_type = data['name']
                task_data = data['request']
                task_id = data['taskId']
                
                request_log = {
                    'time': datetime.now(),
                    'id': task_id,
                    'type': task_type,
                    'input': task_data
                }
                
                if task_type in TASKS:
                    task_class = TASKS[task_type]
                    response_class = getattr(proto_tasks, f"{task_type}Response")
                    
                    async def send_update(update):
                        wrapped = response_class(result=update)
                        await websocket.send_json({
                            'type': 'incrementalUpdate',
                            'taskId': task_id,
                            'update': proto_tasks.TaskResponse(**{task_type.lower(): wrapped}).to_dict()
                        })
                    
                    if task_type not in loaded_tasks:
                        task_class.load()
                        loaded_tasks.add(task_type)
                    
                    try:
                        result = await task_class.execute(**task_data, send_update=send_update)
                        task_response = response_class(result=result)
                        response = {
                            'type': 'result',
                            'taskId': task_id,
                            'result': proto_tasks.TaskResponse(**{task_type.lower(): task_response}).to_dict()
                        }
                        await websocket.send_json(response)
                        request_log['response'] = response
                    except Exception as e:
                        error_response = {
                            'type': 'error',
                            'taskId': task_id,
                            'error': str(e)
                        }
                        await websocket.send_json(error_response)
                        request_log['response'] = error_response
                else:
                    error_response = {
                        'type': 'error',
                        'taskId': task_id,
                        'error': f"Unknown task type: {task_type}"
                    }
                    await websocket.send_json(error_response)
                    request_log['response'] = error_response
                
                request_logs.append(request_log)
            elif data['type'] == 'file_update':
                file_id = data['fileId']
                if data['action'] == 'add':
                    available_files.add(file_id)
                elif data['action'] == 'remove':
                    available_files.discard(file_id)
            elif data['type'] == 'pause':
                # Implement pause functionality
                pass
            elif data['type'] == 'resume':
                # Implement resume functionality
                pass
                
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        print(f"Client {client_id} disconnected, active connections: {len(active_connections)}")
        del active_connections[client_id]

if __name__ == "__main__":
    import uvicorn
    
    parser = argparse.ArgumentParser(description="Run the FastAPI server with specified tasks.")
    parser.add_argument('tasks', nargs='*', help='List of task names to load (optional, loads all tasks if not specified)')
    args = parser.parse_args()

    if args.tasks:
        load_tasks(args.tasks)
    else:
        load_tasks()  # Load all tasks
    
    uvicorn.run(app, host="0.0.0.0", port=8000)