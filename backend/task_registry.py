# tasks/task_registry.py

import importlib
import os
from typing import Dict, Callable

def load_tasks() -> Dict[str, Callable]:
    tasks = {}
    tasks_dir = os.path.dirname("./tasks/")
    for filename in os.listdir(tasks_dir):
        if filename.endswith('.py') and not filename.startswith('__'):
            module_name = filename[:-3]
            module = importlib.import_module(f'tasks.{module_name}')
            if hasattr(module, module_name):
                task_func = getattr(module, module_name)
                tasks[module_name] = task_func
    return tasks

TASKS = load_tasks()