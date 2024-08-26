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

sys.path.append(os.path.dirname((os.path.abspath(__file__))))
from db import add_file_mapping, get_file_path

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from proto.py.tasks import File as FileProto # type: ignore
from proto.py import websocket as wsmsg # type: ignore

class FileReference:
    def __init__(self, filename: Optional[str] = None, mode: str = 'r'):
        self.id = str(uuid.uuid4())
        self.filename = filename or f"{self.id}.bin"
        self.mode = mode
        self.files_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "files"))
        os.makedirs(self.files_dir, exist_ok=True)
        self.file_path = os.path.join(self.files_dir, self.filename)
        self._file_object: Optional[IO[Any]] = None

        # Add the file mapping to the database
        add_file_mapping(self.id, self.file_path)

    @classmethod
    def from_id(cls, file_id: str):
        file_path = get_file_path(file_id)
        return cls(filename=os.path.basename(file_path))

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
        
    async def notify_client(self, websocket: WebSocket):
        file_send_message = wsmsg.ServerMessage(
            file_send=wsmsg.FileSend(
                file_id=self.id,
                content=""  # We're not sending the content, just the file reference
            )
        )
        await websocket.send_bytes(bytes(file_send_message))
        print(f"Notified client about file: {self.filename}")
