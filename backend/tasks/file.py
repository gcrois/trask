import asyncio
import os
import sys
import uuid
import base64
import mimetypes
from typing import Optional, IO, Any
from contextlib import contextmanager
from fastapi import WebSocket

import betterproto

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from proto.py.tasks import File as FileProto # type: ignore
from proto.py import websocket as wsmsg # type: ignore

class File:
    def __init__(self, filename: Optional[str] = None, mode: str = 'r'):
        self.id = str(uuid.uuid4())
        self.filename = filename or f"{self.id}.bin"
        self.mode = mode
        self.files_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "files"))
        os.makedirs(self.files_dir, exist_ok=True)
        self.file_path = os.path.join(self.files_dir, self.filename)
        self._file_object: Optional[IO[Any]] = None

    @contextmanager
    def open(self, mode: Optional[str] = None):
        mode = mode or self.mode
        try:
            self._file_object = open(self.file_path, mode)
            yield self._file_object
        finally:
            if self._file_object:
                self._file_object.close()
            self._file_object = None

    def __enter__(self):
        self._file_object = open(self.file_path, self.mode)
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        if self._file_object:
            self._file_object.close()
        self._file_object = None

    def __getattr__(self, name):
        if self._file_object and hasattr(self._file_object, name):
            return getattr(self._file_object, name)
        raise AttributeError(f"'File' object has no attribute '{name}'")

    def read(self, *args, **kwargs):
        with self.open('rb') as f:
            return f.read(*args, **kwargs)

    def write(self, content, *args, **kwargs):
        with self.open('wb') as f:
            return f.write(content, *args, **kwargs)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "path": self.file_path
        }

    def to_proto(self):
        return FileProto(
            type="file_reference",
            id=self.id,
            name=self.filename,
            size=os.path.getsize(self.file_path),
            hash="hash"  # Note: implement real hashing if needed
        )

    @property
    def path(self):
        return self.file_path
    
    def to_base64(self):
        with self.open('rb') as f:
            return base64.b64encode(f.read()).decode("utf-8")

    async def send(self, websocket: WebSocket, max_retries: int = 5):
        mime_type, _ = mimetypes.guess_type(self.file_path)
        if mime_type is None:
            mime_type = 'application/octet-stream'

        file_content = base64.b64encode(self.read()).decode("utf-8")
        data_url = f"data:{mime_type};base64,{file_content}"

        file_send_message = wsmsg.ServerMessage(
            file_send=wsmsg.FileSend(
                file_id=self.id,
                content=data_url
            )
        )
        await websocket.send_bytes(bytes(file_send_message))
        print(f"Sending file: {self.filename}")

        for attempt in range(max_retries):
            try:
                print(f"Getting response from sending file: {self.filename} (Attempt {attempt + 1}/{max_retries})")
                
                print("Waiting for client to acknowledge file")
                data = await websocket.receive_bytes()
                print("Got response, parsing!")
                message = wsmsg.ClientMessage().parse(data)
                message_type, message_content = betterproto.which_one_of(message, "message")
                
                if message_type == "file_receive":
                    if message_content.file_id == self.id:
                        print(f"File {self.filename} successfully sent and acknowledged")
                        return self.id
                    else:
                        print(f"Unexpected file id in file_receive message: {message_content.file_id}, expected {self.id}")
                else:
                    print(f"Unexpected message type: {message_type}, expected 'file_receive'")

                if attempt < max_retries - 1:
                    print(f"Retrying in 5 seconds...")
                    await asyncio.sleep(0.1)
            except Exception as e:
                print(f"Error occurred while sending file: {str(e)}")
                if attempt < max_retries - 1:
                    print(f"Retrying in 5 seconds...")
                    await asyncio.sleep(0.1)

        raise Exception(f"Failed to send file {self.filename} after {max_retries} attempts")