from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from proto.py.tasks import TaskRequest, TaskResponse, CapitalizeTextRequest, ReverseTextRequest, CapitalizeTextResponse, ReverseTextResponse

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
async def execute_task(data: TaskRequest):
    print("Received task request:", data)
    parsed = data.to_dict()
    assert len(parsed.keys()) == 1, "Only one task type is allowed"
    
    task_type = list(parsed.keys())[0]
    
    if task_type == "capitalize":
        input_text = parsed["capitalize"]["input"]
        result = input_text.upper()
        return TaskResponse(capitalize=CapitalizeTextResponse(result=result))
        # response = CapitalizeTextResponse(result=result)
    elif task_type == "reverse":
        input_text = parsed["reverse"]["input"]
        result = input_text[::-1]
        return TaskResponse(reverse=ReverseTextResponse(result=result))
        # response = ReverseTextResponse(result=result)
    else:
        raise HTTPException(status_code=400, detail="Unknown task type")
    
    # return TaskResponse(**{task_type: response})
    # for key in data.to_dict().keys():
    #     print(key)
    # if not data.taskName or not data.input:
    #     raise HTTPException(status_code=400, detail="taskName and input are required")

    # task_name = data.taskName
    # input_text = data.input.input

    # if task_name == "capitalize":
    #     result = input_text.upper()
    # elif task_name == "reverse":
    #     result = input_text[::-1]
    # else:
    #     raise HTTPException(status_code=400, detail="Unknown task")
    
    # return {"result": result}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="debug")
