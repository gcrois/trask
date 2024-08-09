from fastapi import FastAPI, HTTPException, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os
from typing import Dict
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.task_registry import TASKS # type: ignore
from proto.py import tasks as proto_tasks # type: ignore

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_connections: Dict[str, WebSocket] = {}

class HandshakeData(BaseModel):
    handshake: bool

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    try:
        while True:
            data = await websocket.receive_json()
            if data['type'] == 'execute':
                task_type = data['name']
                task_data = data['request']
                task_id = data['taskId']
                if task_type in TASKS:
                    task_func = TASKS[task_type]
                    response_class = getattr(proto_tasks, f"{task_type.capitalize()}Response")
                    
                    async def send_update(update):
                        await websocket.send_json({
                            'type': 'incrementalUpdate',
                            'taskId': task_id,
                            'update': update
                        })

                    result = task_func(send_update=send_update, **task_data)
                    task_response = response_class(result=result)
                    await websocket.send_json({
                        'type': 'result',
                        'taskId': task_id,
                        'result': proto_tasks.TaskResponse(**{task_type: task_response}).to_dict()
                    })
                else:
                    await websocket.send_json({
                        'type': 'error',
                        'taskId': task_id,
                        'error': f"Unknown task type: {task_type}"
                    })
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        del active_connections[client_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="debug")