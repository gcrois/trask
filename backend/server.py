from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
import json
import argparse
from typing import Dict, List, Type, Set, Any
from datetime import datetime
import atexit
import importlib
import asyncio
import betterproto

from protobuf_generator import ProtoGenerator

from tasks.task import Task, File

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from proto.py import tasks as proto_tasks  # type: ignore
from proto.py import websocket as wsmsg

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
    def adapt_name(task_name):
        return ProtoGenerator.to_pascal_case(task_name)
    
    # Prioritize tasks that are already loaded and have all required files
    for task in available_tasks:
        task_name = adapt_name(task['name'])
        if task_name in loaded_tasks:
            task_files = set(file['id'] for file in task.get('files', []))
            if task_files.issubset(available_files):
                return task
    
    # now, prioritize tasks that are already loaded
    for task in available_tasks:
        task_name = adapt_name(task['name'])
        if task_name in loaded_tasks:
            return task
    
    # now, tasks that have all required files and are in TASKS
    for task in available_tasks:
        task_files = set(file['id'] for file in task.get('files', []))
        if task_files.issubset(available_files) and adapt_name(task['name']) in TASKS:
            return task
        
    # finally, take any task in TASKS
    for task in available_tasks:
        if adapt_name(task['name']) in TASKS:
            return task

VERBOSE = True  # Set this to False to disable verbose printing

def verbose_print(action: str, message: Any, client_id: str = "NA"):
    if not VERBOSE:
        return

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    client_info = f"Client {client_id}: " if client_id else ""
    
    print(f"[{timestamp}] {client_info}{action}")
    
    if isinstance(message, (wsmsg.ClientMessage, wsmsg.ServerMessage)):
        # For protobuf messages, we'll print the dictionary representation
        print(json.dumps(message.to_dict(), indent=2))
    elif isinstance(message, bytes):
        # For raw bytes, we'll print the length and the first few bytes
        print(f"Raw bytes (length: {len(message)}): {message[:20]}...") # type: ignore
    else:
        # For other types, we'll use the default string representation
        print(str(message))
    
    print("---------------------")

# Now, let's update our websocket_endpoint function to use this verbose_print function:

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    verbose_print("Connection established", f"Active connections: {len(active_connections)}", client_id)
    
    # wait for initial message
    data = await websocket.receive_bytes()
    # parse the message
    client_message = wsmsg.ClientMessage().parse(data)
    # verify that its client handshake
    message_type, version = betterproto.which_one_of(client_message, "message")
    if message_type != "handshake":
        verbose_print("Invalid handshake message", client_message, client_id)
        await websocket.close(1000, "Invalid handshake message")
        return
    verbose_print("Received handshake", client_message, client_id)
    
    # send server handshake
    await websocket.send_bytes(bytes(wsmsg.ServerMessage(handshake=wsmsg.ServerHandshake("0.0.0"))))
    
    # to start off, ask for available tasks
    await websocket.send_bytes(bytes(wsmsg.ServerMessage(request_available_tasks=wsmsg.RequestAvailableTasks(client_id=client_id))))
    verbose_print("Requested available tasks from", "", client_id)
    
    try:
        while True:
            data = await websocket.receive_bytes()
            verbose_print("Received raw message", data, client_id)
            
            client_message = wsmsg.ClientMessage().parse(data)
            verbose_print("Parsed client message", client_message, client_id)
            
            message_type, message_content = betterproto.which_one_of(client_message, "message")
            
            if message_type == "available_tasks":
                verbose_print("Processing available tasks", message_content, client_id)
                available_tasks = [
                    {"id": task.id, "name": task.name, "request": task.request.to_dict()}
                    for task in message_content.tasks
                ]
                selected_task = select_task(available_tasks)
                if selected_task:
                    response = wsmsg.ServerMessage(
                        accept_task=wsmsg.AcceptTask(task_id=selected_task['id'])
                    )
                    verbose_print("Sending response", response, client_id)
                    await websocket.send_bytes(bytes(response))
                else:
                    print(f"No task available from list -- eligle task types: {TASKS.keys()}")
                    response = wsmsg.ServerMessage(no_task_available=wsmsg.NoTaskAvailable())
            
            elif message_type == "execute":
                verbose_print("Executing task", message_content, client_id)
                task_type = ProtoGenerator.to_pascal_case(message_content.name)
                task_data = message_content.request.to_dict()
                task_id = message_content.task_id
                
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
                        incremental_update = wsmsg.ServerMessage(
                            incremental_update=wsmsg.IncrementalUpdate(
                                task_id=task_id,
                                update=proto_tasks.TaskResponse(**{task_type.lower(): wrapped})
                            )
                        )
                        verbose_print("Sending incremental update", incremental_update, client_id)
                        await websocket.send_bytes(bytes(incremental_update))
                    try:
                        if task_type not in loaded_tasks:
                            try:
                                task_class.load()
                            except RuntimeError as e:
                                # match CUDA memory error
                                if "CUDA" in str(e):
                                    # try unloading all tasks and retry
                                    for task in loaded_tasks:
                                        TASKS[task].unload()
                                    loaded_tasks.clear()
                                    task_class.load()
                                    
                            loaded_tasks.add(task_type)
                    
                        result = await task_class.execute(**task_data[task_type.lower()], send_update=send_update)
                        task_response = response_class(result=result)
                        response = wsmsg.ServerMessage(
                            task_result=wsmsg.TaskResult(
                                task_id=task_id,
                                result=proto_tasks.TaskResponse(**{task_type.lower(): task_response})
                            )
                        )
                        verbose_print("Sending task result", response, client_id)
                        await websocket.send_bytes(bytes(response))
                        request_log['response'] = response.to_dict()

                    except Exception as e:
                        error_response = wsmsg.ServerMessage(
                            error=wsmsg.ErrorResponse(
                                task_id=task_id,
                                error=str(e)
                            )
                        )
                        verbose_print("Sending error response", error_response, client_id)
                        await websocket.send_bytes(bytes(error_response))
                        request_log['response'] = error_response.to_dict()
                else:
                    error_response = wsmsg.ServerMessage(
                        error=wsmsg.ErrorResponse(
                            task_id=task_id,
                            error=f"Unknown task type: {task_type} -- available tasks: {list(TASKS.keys())}"
                        )
                    )
                    verbose_print("Sending error response for unknown task type", error_response, client_id)
                    await websocket.send_bytes(bytes(error_response))
                    request_log['response'] = error_response.to_dict()
                
                request_logs.append(request_log)
            
            elif message_type == "file_response":
                verbose_print("Received file response", message_content, client_id)
                # Handle file response
                file_id = message_content.file_id
                content = message_content.content
                # Process the file content as needed
            
            elif message_type == "pause":
                verbose_print("Received pause request", message_content, client_id)
                # Implement pause functionality
                pass
            
            elif message_type == "resume":
                verbose_print("Received resume request", message_content, client_id)
                # Implement resume functionality
                pass
            
            else:
                verbose_print("Received unknown message type", f"{message_type}: {message_content}", client_id)
                
    except WebSocketDisconnect:
        verbose_print("WebSocket disconnected", "", client_id)
    finally:
        del active_connections[client_id]
        verbose_print("Connection closed", f"Active connections: {len(active_connections)}", client_id)
        
if __name__ == "__main__":
    import uvicorn
    
    parser = argparse.ArgumentParser(description="Run the FastAPI server with specified tasks.")
    parser.add_argument('tasks', nargs='*', help='List of task names to load (optional, loads all tasks if not specified)')
    args = parser.parse_args()

    if args.tasks:
        load_tasks(args.tasks)
    else:
        load_tasks()  # Load all tasks
    
    cert_path = os.path.join(os.path.dirname(__file__), '..', 'certs', 'cert.pem')
    key_path = os.path.join(os.path.dirname(__file__), '..', 'certs', 'key.pem')
    if os.path.exists(cert_path) and os.path.exists(key_path):
        print("SSL certificate and key found. Running server with SSL.")
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            ssl_keyfile=key_path,
            ssl_certfile=cert_path
        )
    else:
        print("SSL certificate and key not found. Running server without SSL.")
        uvicorn.run(app, host="0.0.0.0", port=8000)