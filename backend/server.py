from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os

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

class HandshakeData(BaseModel):
    handshake: bool

@app.post("/handshake")
async def handshake(data: HandshakeData):
    if data.handshake:
        return {"status": "Handshake successful"}
    raise HTTPException(status_code=400, detail="Invalid handshake request")

@app.post("/execute")
async def execute_task(request: Request):
    data = await request.json()
    print("Received task request:", data)
    
    assert len(data.keys()) == 1, "Only one task type is allowed"
    task_type = list(data.keys())[0]

    if task_type in TASKS:
        task_data = data[task_type]
        task_func = TASKS[task_type]
        
        # Dynamically create the request and response protobuf objects
        response_class = getattr(proto_tasks, f"{task_type.capitalize()}Response")

        # Execute the task
        result = task_func(**task_data)
        
        # Create the response
        task_response = response_class(result=result)
        return proto_tasks.TaskResponse(**{task_type: task_response})
    else:
        raise HTTPException(status_code=400, detail=f"Unknown task type: {task_type}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="debug")