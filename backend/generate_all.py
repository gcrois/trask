import os
import importlib
import sys
from typing import List
from tasks.task import Task
from protobuf_generator import proto_gen, generate_protobuf_definitions

def import_all_task_files(tasks_dir: str = './tasks') -> List[str]:
    imported_modules: List[str] = []
    sys.path.append(os.path.abspath(tasks_dir))
    print(f"Searching for task files in: {tasks_dir}")
    for filename in os.listdir(tasks_dir):
        if filename.endswith('.py') and filename != '__init__.py':
            print(f"Found task file: {filename}")
            module_name = filename[:-3]  # Remove .py extension
            module = importlib.import_module(module_name)
            imported_modules.append(module_name)
            print(f"Imported module: {module_name}")
            # Find and register Task subclasses
            for name, obj in module.__dict__.items():
                if isinstance(obj, type) and issubclass(obj, Task) and obj != Task:
                    print(f"Found Task subclass: {name}")
                    task_instance = obj()
                    proto_gen.add_task(task_instance)
    return imported_modules

def generate_proto_file(output_file: str = 'tasks.proto') -> None:
    proto_definitions = generate_protobuf_definitions()
    with open(output_file, 'w') as f:
        f.write(proto_definitions)
    print(f"Proto file generated successfully: {output_file}")

def main() -> None:
    imported_modules = import_all_task_files()
    print(f"Imported modules: {', '.join(imported_modules)}")
    generate_proto_file()

if __name__ == "__main__":
    main()