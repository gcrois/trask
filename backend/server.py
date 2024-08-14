from fastapi import FastAPI, HTTPException, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os
import json
from typing import Dict, List
from datetime import datetime
import atexit

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.task_registry import TASKS  # type: ignore
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

# Data structure to store request and response logs
request_logs: List[Dict] = []

class HandshakeData(BaseModel):
    handshake: bool

def dump_logs():
    """Dump the logs to a timestamped file in the ./dumps/ directory when the server stops."""
    # Ensure the dumps directory exists
    dumps_dir = os.path.join(os.path.dirname('.'), 'dumps')
    os.makedirs(dumps_dir, exist_ok=True)

    # Create a timestamped filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_logs.json"
    filepath = os.path.join(dumps_dir, filename)

    # Write the logs to the file
    with open(filepath, 'w') as f:
        json.dump(request_logs, f, indent=2, default=str)
    print(f"Logs dumped to {filepath}")

# Register the dump_logs function to be called when the script exits
atexit.register(dump_logs)

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    print(f"Client {client_id} connected, active connections: {len(active_connections)}")
    
    try:
        while True:
            data = await websocket.receive_json()
            if data['type'] == 'execute':
                task_type = data['name']
                task_data = data['request']
                task_id = data['taskId']
                
                # Log the request
                request_log = {
                    'time': datetime.now(),
                    'id': task_id,
                    'type': task_type,
                    'input': task_data
                }
                
                if task_type in TASKS:
                    task_func = TASKS[task_type]
                    response_class = getattr(proto_tasks, f"{task_type.capitalize()}Response")
                    
                    async def send_update(update):
                        wrapped = response_class(result=update)
                        await websocket.send_json({
                            'type': 'incrementalUpdate',
                            'taskId': task_id,
                            'update': proto_tasks.TaskResponse(**{task_type: wrapped}).to_dict()
                        })
                    
                    result = await task_func(**task_data, send_update=send_update)
                    task_response = response_class(result=result)
                    response = {
                        'type': 'result',
                        'taskId': task_id,
                        'result': proto_tasks.TaskResponse(**{task_type: task_response}).to_dict()
                    }
                    await websocket.send_json(response)
                    
                    # Log the response
                    request_log['response'] = response
                else:
                    error_response = {
                        'type': 'error',
                        'taskId': task_id,
                        'error': f"Unknown task type: {task_type}"
                    }
                    await websocket.send_json(error_response)
                    
                    # Log the error response
                    request_log['response'] = error_response
                
                # Add the complete log entry to the list
                request_logs.append(request_log)
                
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        del active_connections[client_id]

if __name__ == "__main__":
    import uvicorn
    
    cert_path = os.path.join(os.path.dirname(__file__), '..', 'certs', 'cert.pem')
    key_path = os.path.join(os.path.dirname(__file__), '..', 'certs', 'key.pem')
    
    # list directory contents
    print(os.listdir(os.path.join(os.path.dirname(__file__), '..', 'certs')))
    
    if os.path.exists(cert_path) and os.path.exists(key_path):
        print("SSL certificates found. Running in HTTPS")
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            ssl_keyfile=key_path,
            ssl_certfile=cert_path
        )
    else:
        print("Warning: SSL certificates not found. Running in HTTP mode.")
        uvicorn.run(app, host="0.0.0.0", port=8000)