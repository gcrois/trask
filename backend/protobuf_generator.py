from __future__ import annotations

import inspect
from typing import Any, Callable, Dict, List, Optional, Tuple, get_args, get_origin, Type
from tasks.task import Task, File

class ProtoGenerator:
    def __init__(self) -> None:
        self.tasks: List[Task] = []
        self.processed_tasks: Dict[str, bool] = {}

    def add_task(self, task: Task) -> None:
        print(f"Attempting to add task: {task.__class__.__name__}")
        if task.__class__.__name__ not in self.processed_tasks:
            self.tasks.append(task)
            self.processed_tasks[task.__class__.__name__] = True
            print(f"Successfully added task: {task.__class__.__name__}")
        else:
            print(f"Task {task.__class__.__name__} already added. Skipping.")

    @staticmethod
    def pytype_to_protobuf_type(pytype: Any) -> str:
        type_mapping: Dict[Any, str] = {
            str: "string",
            int: "int32",
            bool: "bool",
            float: "float",
            bytes: "bytes",
            File: "FileReference"
        }
        
        origin = get_origin(pytype)
        if origin is list or origin is List:
            args = get_args(pytype)
            if args:
                element_type = args[0]
                if get_origin(element_type) is tuple or get_origin(element_type) is Tuple:
                    return f"repeated string"  # Assuming Tuple[str, str] for messages
                return f"repeated {ProtoGenerator.pytype_to_protobuf_type(element_type)}"
        elif origin is tuple or origin is Tuple:
            return "repeated string"  # Assuming Tuple[str, str] for individual messages
        
        return type_mapping.get(pytype, "string")

    @staticmethod
    def to_pascal_case(snake_str: str) -> str:
        return ''.join(x.capitalize() for x in snake_str.split('_'))

    @staticmethod
    def to_camel_case(snake_str: str) -> str:
        components = snake_str.split('_')
        return components[0] + ''.join(x.capitalize() for x in components[1:])

    def generate_new_request_message(self, task_name: str, params: Dict[str, Any], ignored_params: Dict[str, Any]) -> Tuple[str, Dict[str, str]]:
        print(f"Generating message for {task_name}")
        pascal_task_name = self.to_pascal_case(task_name)
        message = f"message {pascal_task_name}Request {{\n"
        fields: Dict[str, str] = {}
        field_index = 1

        # Add comments for ignored parameters
        if ignored_params:
            message += "  // Ignored parameters:\n"
            for param_name, param_type in ignored_params.items():
                message += f"  // {param_name}: {param_type}\n"
            message += "\n"

        for param_name, param_type in params.items():
            proto_type = self.pytype_to_protobuf_type(param_type)
            camel_param_name = self.to_camel_case(param_name)
            message += f"  {proto_type} {camel_param_name} = {field_index};\n"
            fields[camel_param_name] = proto_type
            field_index += 1
        message += "}\n\n"
        return message, fields

    def generate_message_definitions(self, task: Task) -> Dict[str, Tuple[str, str, Dict[str, str], Dict[str, str]]]:
        print(f"Generating message definitions for {task.__class__.__name__}")
        results = {}
        for name, proto_info in task.get_proto_info().items():
            assert name == proto_info['name']
            task_name = proto_info['name']
            params = proto_info['params']
            ignored_params = proto_info['ignored_params']
            return_type = proto_info['return_type']
            
            request_message, request_fields = self.generate_new_request_message(task_name, params, ignored_params)
            response_message, response_fields = self.generate_new_response_message(task_name, return_type)
            results[task_name] = (request_message, response_message, request_fields, response_fields)
        return results

    def generate_new_response_message(self, task_name: str, return_type: Any) -> Tuple[str, Dict[str, str]]:
        response_type = self.pytype_to_protobuf_type(return_type)
        pascal_task_name = self.to_pascal_case(task_name)
        message = f"message {pascal_task_name}Response {{\n"
        message += f"  {response_type} result = 1;\n"
        message += "}\n\n"
        return message, {"result": response_type}

    def generate_protobuf_definitions(self) -> str:
        print(f"Generating protobuf definitions for {len(self.tasks)} tasks")
        proto_definitions = "syntax = \"proto3\";\n\nimport \"definitions.proto\";\n\n"
        task_request_oneof = "message TaskRequest {\n  oneof task {\n"
        task_response_oneof = "message TaskResponse {\n  oneof response {\n"
        
        field_index = 1
        for task in self.tasks:
            message_definitions = self.generate_message_definitions(task)
            for task_name, (request_message, response_message, _, _) in message_definitions.items():
                proto_definitions += request_message + response_message
                pascal_task_name = self.to_pascal_case(task_name)
                task_request_oneof += f"    {pascal_task_name}Request {task_name.lower()} = {field_index};\n"
                task_response_oneof += f"    {pascal_task_name}Response {task_name.lower()} = {field_index};\n"
                field_index += 1
        
        task_request_oneof += "  }\n}\n\n"
        task_response_oneof += "  }\n}\n"
        
        proto_definitions += task_request_oneof + task_response_oneof
        
        return proto_definitions

# Create an instance of ProtoGenerator
proto_gen = ProtoGenerator()

# Export the necessary components
add_task = proto_gen.add_task
generate_protobuf_definitions = proto_gen.generate_protobuf_definitions