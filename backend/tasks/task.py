from abc import ABC, abstractmethod
from typing import Any, Callable, Awaitable, Dict, List
import inspect

def noop(*args, **kwargs):
    print("Noop called", args, kwargs)

class Task(ABC):
    def __init__(self):
        self._proto_info: Dict[str, Dict[str, Any]] = {}

    @classmethod
    @abstractmethod
    def load(cls) -> None:
        """Load any necessary models or resources for the task."""
        pass

    @classmethod
    @abstractmethod
    def unload(cls) -> None:
        """Unload models or free up resources."""
        pass

    @classmethod
    @abstractmethod
    async def execute(cls, *args: Any, **kwargs: Any) -> Any:
        """Execute the task."""
        pass

    def add_task(self, func: Callable, task_name: str, exclude_params: List[str] = []):
        if 'send_update' not in exclude_params:
            exclude_params.append('send_update')
        
        sig = inspect.signature(func)
        params_info = {}
        ignored_params = {}
        for name, param in sig.parameters.items():
            if name in exclude_params or name in ['self', 'cls']:
                ignored_params[name] = param.annotation
            else:
                params_info[name] = param.annotation

        self._proto_info[task_name] = {
            'function': func,
            'name': task_name,
            'params': params_info,
            'ignored_params': ignored_params,
            'return_type': sig.return_annotation,
            'exclude_params': exclude_params
        }
        
        print(f"Added task: {task_name} for {self.__class__.__name__}")

    def get_proto_info(self):
        return self._proto_info
    
class File:
    def __init__(self):
        pass

# Example usage:
# class MyTask(Task):
#     def __init__(self):
#         super().__init__()
#         self.add_task(self.custom_execute, "CustomExecute")
#
#     @classmethod
#     def load(cls):
#         # Load resources
#         pass
#
#     @classmethod
#     def unload(cls):
#         # Unload resources
#         pass
#
#     @classmethod
#     async def execute(cls, arg1: str, arg2: int = 0, send_update = None) -> str:
#         # Default task implementation
#         return result
#
#     @classmethod
#     async def custom_execute(cls, custom_arg: float, send_update = None) -> dict:
#         # Custom task implementation
#         return result