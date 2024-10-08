from typing import List, Tuple, Callable, Awaitable
from functools import wraps
from tasks.openai_client import client
from tasks.task import Task
from tasks.file import FileReference

def noop(*args, **kwargs):
    print("Noop called", args, kwargs)
    pass

class File2Text(Task):
    def __init__(self):
        super().__init__()
        self.add_task(self.execute, "File2Text", exclude_params=["client", "send_update"])
        
    @classmethod
    def load(cls):
        # No specific loading required for this task
        pass

    @classmethod
    def unload(cls):
        # No specific unloading required for this task
        pass

    @classmethod
    async def execute(cls,
        file: FileReference,
        max_tokens: int = 100,
        client = client,
        send_update: Callable[[str], Awaitable[None]] = noop
    ) -> str:
        print(f"File2Text: {file}")
        
        # open file at path
        with open(file.file_path, 'rb') as f:
            # get filesize
            f.seek(0, 2)
            filesize = f.tell()
            f.seek(0)
            
        return f"File2Text: {file.file_path} ({filesize} bytes)"
