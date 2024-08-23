import mimetypes
import traceback
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
import betterproto
import uuid

from time import sleep

from protobuf_generator import ProtoGenerator

from tasks.task import Task
from tasks.file import File

import base64

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from proto.py import tasks as proto_tasks  # type: ignore
from proto.py import websocket as wsmsg

file_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'files')

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
available_files: Dict[str, File] = {}

def adapt_name(task_name):
    pascal = ProtoGenerator.to_pascal_case(task_name)
    # also cap after numbers
    final = ""
    for i, c in enumerate(pascal):
        if i > 0 and pascal[i-1].isdigit() and c.isalpha() and c.islower():
            final += c.upper()
        else:
            final += c
    
    return final

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

def base64_to_file(base64_str: str, file_path: str):
    header, encoded = base64_str.split(",", 1)
    with open(file_path, 'wb') as f:
        f.write(base64.b64decode(encoded))

def load_tasks(task_names: List[str] = []):
    global TASKS
    tasks_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend/tasks')
    sys.path.append(tasks_dir)
    
    for filename in os.listdir(tasks_dir):
        if filename.endswith('.py') and filename != '__init__.py':
            module_name = filename[:-3]
            try:
                module = importlib.import_module(module_name)
                for name, obj in module.__dict__.items():
                    if isinstance(obj, type) and issubclass(obj, Task) and obj != Task:
                        if not task_names or name in task_names:
                            TASKS[name] = obj
                            print(f"Enabled task: {name}")
            except Exception as e:
                print(f"Error loading task {module_name}: {e}")
    
    for task in task_names:
        if task not in TASKS:
            print(f"Task not found, cannot enable: {task}")

def get_task_files(task: Dict) -> Dict[str, str]:
    files = {}
    
    for param, value in task.items():
        # check if value has a field "type", and if it has value "file_reference"
        if isinstance(value, dict) and value.get('type') == 'file_reference':
            files[param] = value['id']
            
    return files

def select_task(available_tasks: List[Dict]):
    print("Available tasks:", [t['name'] for t in available_tasks])
    print("Adapted names:", [adapt_name(t['name']) for t in available_tasks])
    # Prioritize tasks that are already loaded and have all required files
    for task in available_tasks:
        task_name = adapt_name(task['name'])
        if task_name in loaded_tasks:
            task_files = set(get_task_files(task).values())
            if task_files.issubset(available_files):
                return task
    
    # now, prioritize tasks that are already loaded
    for task in available_tasks:
        task_name = adapt_name(task['name'])
        if task_name in loaded_tasks:
            return task
    
    # now, tasks that have all required files and are in TASKS
    for task in available_tasks:
        task_files = set(get_task_files(task).values())
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

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    verbose_print("Connection established", f"Active connections: {len(active_connections)}, now waiting for handshake", client_id)
    
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
    
    # todo: kill this lmao
    sleep(1)
    
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
                content: wsmsg.ExecuteTask = message_content
                task_type = ProtoGenerator.to_pascal_case(content.name)
                super_pascal = adapt_name(task_type)
                task_data = content.request.to_dict()
                task_id = content.task_id
                
                verbose_print("Executing task", task_data, client_id)
                print("TASK FILES", get_task_files(task_data[task_type.lower()]))
                
                # get file object for each file id
                files = get_task_files(task_data[task_type.lower()])

                for param, file_id in files.items():
                    if file_id in available_files:
                        task_data[task_type.lower()][param] = available_files[file_id]
                    else:
                        # request file
                        file_request = wsmsg.ServerMessage(file_request=wsmsg.FileRequest(file_id=file_id))
                        # send file request
                        await websocket.send_bytes(bytes(file_request))
                        # wait for file response
                        file_response = await websocket.receive_bytes()
                        # parse file response
                        parsed_response = wsmsg.ClientMessage().parse(file_response)
                        # get file content
                        slim = parsed_response.file_response.content
                        # save base64 string to file
                        file_path = os.path.join(file_dir, file_id.split(':')[-1])
                        base64_to_file(slim, file_path)
                        # create File object
                        file = File(file_path)
                        task_data[task_type.lower()][param] = file
                        available_files[file_id] = file
                
                request_log = {
                    'time': datetime.now(),
                    'id': task_id,
                    'type': task_type,
                    'input': task_data
                }
                
                if super_pascal in TASKS:
                    task_class = TASKS[super_pascal]
                    response_class = getattr(proto_tasks, f"{task_type}Response")
                    
                    async def send_update(msg: str, update=None):
                        wrapped = response_class(result=update)
                        incremental_update = wsmsg.ServerMessage(
                            incremental_update=wsmsg.IncrementalUpdate(
                                task_id=task_id,
                                msg=msg,
                                update=update if update else proto_tasks.TaskResponse(**{task_type.lower(): wrapped})
                            )
                        )
                        verbose_print("Sending incremental update", incremental_update, client_id)
                        await websocket.send_bytes(bytes(incremental_update))
                        return "success"
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
                        
                        # recursively convert File objects to proto
                        async def convert_to_proto(obj):
                            if isinstance(obj, File):
                                await obj.send(websocket)
                                return obj.to_proto()
                            elif isinstance(obj, dict):
                                return {k: convert_to_proto(v) for k, v in obj.items()}
                            elif isinstance(obj, list):
                                return [convert_to_proto(v) for v in obj]
                            elif isinstance(obj, tuple):
                                return tuple(convert_to_proto(v) for v in obj)
                            else:
                                return obj
                            
                        result = await convert_to_proto(result)
                        
                        task_response = response_class(result=result)
                        
                        task_response_dict = task_response.to_dict()
                        print("TASK RESPONSE", task_response_dict)
                        
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
                        error_traceback = traceback.format_exc()
                        error_response = wsmsg.ServerMessage(
                            error=wsmsg.ErrorResponse(
                                task_id=task_id,
                                error=f"Error: {str(e)}\n\nTraceback:\n{error_traceback}"
                            )
                        )
                        verbose_print("Sending error response", error_response, client_id)
                        await websocket.send_bytes(bytes(error_response))
                        request_log['response'] = error_response.to_dict()
                        request_log['error_traceback'] = error_traceback
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
    parser.add_argument('--port', type=int, help='Port to run the server on (default: 8000)')
    # bool option to try to preload all tasks
    parser.add_argument('--preload', action='store_true', help='Preload all tasks')
    args = parser.parse_args()

    if args.tasks:
        load_tasks(args.tasks)
    else:
        load_tasks() # Load all tasks
        
    if args.preload:
        for task_name, task_class in TASKS.items():
            task_class.load()
            loaded_tasks.add(task_name)
        
    port = args.port if args.port else 8000
    
    cert_path = os.path.join(os.path.dirname(__file__), '..', 'certs', 'cert.pem')
    key_path = os.path.join(os.path.dirname(__file__), '..', 'certs', 'key.pem')
    if os.path.exists(cert_path) and os.path.exists(key_path):
        print("SSL certificate and key found. Running server with SSL.")
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=port,
            ssl_keyfile=key_path,
            ssl_certfile=cert_path
        )
    else:
        print("SSL certificate and key not found. Running server without SSL.")
        uvicorn.run(app, host="0.0.0.0", port=port)