# protobuf_generator.py

from typing import Callable, List, Any, Dict, Tuple, get_origin, get_args
import inspect
from tree_sitter import Language, Parser
import tree_sitter_proto  # type: ignore

# Initialize the parser
parser = Parser()
parser.language = Language(tree_sitter_proto.language())

# List to store decorated functions
functions: List[Callable] = []

def proto(func: Callable):
    """
    Decorator to mark functions for protobuf generation.
    """
    functions.append(func)
    return func

def pytype_to_protobuf_type(pytype: Any) -> str:
    type_mapping = {
        str: "string",
        int: "int32",
        bool: "bool",
        float: "float",
        bytes: "bytes",
    }
    
    if get_origin(pytype) is list:
        element_type = get_args(pytype)[0]
        return f"repeated {type_mapping.get(element_type, 'string')}"
    
    return type_mapping.get(pytype, "string")

def to_camel_case(snake_str: str) -> str:
    components = snake_str.split('_')
    return components[0] + ''.join(x.capitalize() for x in components[1:])

def get_child_with_type(node, type_name: str):
    return next(filter(lambda x: x.type == type_name, node.children), None)

def parse_message_body(node) -> Dict[str, str]:
    fields = {}
    for child in node.children:
        if child.type == "field":
            field_type_node = get_child_with_type(child, "type")
            field_name_node = get_child_with_type(child, "identifier")
            if field_type_node is not None and field_name_node is not None:
                field_type = field_type_node.text.decode("utf8")
                field_name = field_name_node.text.decode("utf8")
                fields[field_name] = field_type
            else:
                print("Warning: 'type' or 'identifier' field is missing in field node.")
        elif child.type == "oneof":
            # Handle oneof fields if necessary
            pass
    return fields

def generate_function_dict(functions: List[Callable]) -> Tuple[Dict[str, Dict[str, str]], Dict[str, Dict[str, str]]]:
    new_requests = {}
    new_responses = {}
    for idx, func in enumerate(functions, start=1):
        sig = inspect.signature(func)
        func_name = to_camel_case(func.__name__.capitalize())

        request_message, response_message, request_fields, response_fields = generate_message_definitions(func_name, sig)

        new_requests[func_name] = request_fields
        new_responses[func_name] = response_fields

    return new_requests, new_responses

def generate_message_definitions(func_name: str, sig: inspect.Signature) -> Tuple[str, str, Dict[str, str], Dict[str, str]]:
    request_message, request_fields = generate_new_request_message(func_name, sig)
    response_message, response_fields = generate_new_response_message(func_name, sig)
    return request_message, response_message, request_fields, response_fields

def generate_new_request_message(func_name: str, sig: inspect.Signature) -> Tuple[str, Dict[str, str]]:
    message = f"message {func_name}Request {{\n"
    fields = {}
    for param_idx, (param_name, param) in enumerate(sig.parameters.items(), start=1):
        proto_type = pytype_to_protobuf_type(param.annotation)
        camel_param_name = to_camel_case(param_name)
        message += f" {proto_type} {camel_param_name} = {param_idx};\n"
        fields[camel_param_name] = proto_type
    message += "}\n\n"
    return message, fields

def generate_new_response_message(func_name: str, sig: inspect.Signature) -> Tuple[str, Dict[str, str]]:
    response_type = pytype_to_protobuf_type(sig.return_annotation)
    message = f"message {func_name}Response {{\n"
    message += f" {response_type} result = 1;\n"
    message += "}\n\n"
    return message, {"result": response_type}

def generate_protobuf_definitions() -> str:
    """
    Generate protobuf definitions for all decorated functions.
    """
    new_requests, new_responses = generate_function_dict(functions)
    return generate_protobuf_definitions_internal((new_requests, new_responses))

def generate_protobuf_definitions_internal(functions: Tuple[Dict[str, Dict[str, str]], Dict[str, Dict[str, str]]]) -> str:
    proto_definitions = ""
    task_request_oneof = "message TaskRequest {\n oneof task {\n"
    task_response_oneof = "message TaskResponse {\n oneof response {\n"
    
    for idx, (func_name, request_fields) in enumerate(functions[0].items(), start=1):
        request_message = f"message {func_name}Request {{\n"
        for field_idx, (field_name, field_type) in enumerate(request_fields.items(), start=1):
            request_message += f" {field_type} {field_name} = {field_idx};\n"
        request_message += "}\n\n"
        proto_definitions += request_message
        task_request_oneof += f" {func_name}Request {func_name.lower()} = {idx};\n"
        
    for idx, (func_name, response_fields) in enumerate(functions[1].items(), start=1):
        response_message = f"message {func_name}Response {{\n"
        for field_idx, (field_name, field_type) in enumerate(response_fields.items(), start=1):
            response_message += f" {field_type} {field_name} = {field_idx};\n"
        response_message += "}\n\n"
        proto_definitions += response_message
        task_response_oneof += f" {func_name}Response {func_name.lower()} = {idx};\n"
        
    task_request_oneof += " }\n}\n"
    task_response_oneof += " }\n}\n"
    
    proto_definitions += task_request_oneof + task_response_oneof
    
    return proto_definitions

# Export the necessary components
__all__ = ['proto', 'generate_protobuf_definitions']