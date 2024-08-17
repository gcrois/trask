import asyncio
import websockets
import json
import uuid

async def test_capitalize():
    uri = "ws://localhost:8000/ws/test-client"
    async with websockets.connect(uri) as websocket:
        # Get available tasks
        await websocket.send(json.dumps({"type": "get_available_tasks"}))
        response = await websocket.recv()
        print("Available tasks:", json.loads(response))

        # Execute Capitalize task
        task_id = str(uuid.uuid4())
        task_request = {
            "type": "execute",
            "taskId": task_id,
            "name": "Capitalize",
            "request": {"text": "hello, world!"}
        }
        await websocket.send(json.dumps(task_request))

        while True:
            response = await websocket.recv()
            data = json.loads(response)
            if data["type"] == "incrementalUpdate":
                print("Incremental update:", data["update"])
            elif data["type"] == "result":
                print("Final result:", data["result"])
                break
            elif data["type"] == "error":
                print("Error:", data["error"])
                break

if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(test_capitalize())
