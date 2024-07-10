from typing import Callable, List, Any, Dict, Tuple
import inspect
from tree_sitter import Language, Parser
import tree_sitter_proto

parser = Parser()
parser.language = Language(tree_sitter_proto.language())

functions: List[Callable] = []

def proto(func: Callable):
    functions.append(func)
    return func

@proto
def say_hello(name: str) -> str:
    print("Hello, ", name)
    return "Hello, " + name

@proto
def add(a: int, b: int) -> int:
    return a + b

@proto
def multiply_integer(a: int, b: int) -> int:
    return a * b

@proto
def subtract(a: int, b: int) -> int:
    return a - b

def pytype_to_protobuf_type(pytype: Any) -> str:
    type_mapping = {
        str: "string",
        int: "int32",
        bool: "bool",
        float: "float",
        bytes: "bytes",
    }
    return type_mapping.get(pytype, "string")

def to_camel_case(snake_str: str) -> str:
    components = snake_str.split('_')
    return components[0] + ''.join(x.capitalize() for x in components[1:])

def read_protobuf_file(file_path: str) -> str:
    with open(file_path, 'r') as f:
        return f.read()
    
def get_child_with_type(node, type_name: str):
    return next(filter(lambda x: x.type == type_name, node.children), None)

def parse_existing_definitions(content: str) -> Tuple[str, Dict[str, Dict[str, str]], Dict[str, Dict[str, str]]]:
    tree = parser.parse(bytes(content, "utf8"))

    package = ""
    existing_requests = {}
    existing_responses = {}

    for child in tree.root_node.children:
        if child.type == "package":
            package_node = get_child_with_type(child, "full_ident")
            if package_node is not None:
                package = package_node.text.decode("utf8")
            else:
                print("Warning: 'full_ident' field is missing in package node.")
        elif child.type == "message":
            message_name_node = get_child_with_type(child, "message_name")
            if message_name_node is not None:
                message_name = message_name_node.text.decode("utf8")
                message_body_node = get_child_with_type(child, "message_body")
                if message_body_node is not None:
                    if message_name.endswith("Request"):
                        existing_requests[message_name[:-7]] = parse_message_body(message_body_node)
                    elif message_name.endswith("Response"):
                        existing_responses[message_name[:-8]] = parse_message_body(message_body_node)
                else:
                    print(f"Warning: 'message_body' field is missing in message node: {message_name}")
                    print(f"Options are: {list(map(lambda x: x.type, child.children))}")
            else:
                print("Warning: 'message_name' field is missing in message node.")
                print(f"Options are: {list(map(lambda x: x.type, child.children))}")
    
    return package, existing_requests, existing_responses

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

def parse_oneof(node) -> Dict[str, str]:
    fields = {}
    for child in node.children:
        if child.type == "oneof_field":
            field_type_node = get_child_with_type(child, "type")
            field_name_node = get_child_with_type(child, "identifier")
            if field_type_node is not None and field_name_node is not None:
                field_type = field_type_node.text.decode("utf8")
                field_name = field_name_node.text.decode("utf8")
                fields[field_name] = field_type
            else:
                print("Warning: 'type' or 'identifier' field is missing in oneof_field node.")
    return fields

def parse_message_fields(node) -> Dict[str, str]:
    fields = {}
    for field in node.children:
        if field.type == "field_definition":
            field_type_node = get_child_with_type(field, "type")
            field_name_node = get_child_with_type(field, "name")
            if field_type_node is not None and field_name_node is not None:
                field_type = field_type_node.text.decode("utf8")
                field_name = field_name_node.text.decode("utf8")
                fields[field_name] = field_type
            else:
                print("Warning: 'type' or 'name' field is missing in field_definition node.")
    return fields

def generate_function_dict(functions: List[Callable]) -> Tuple[Dict[str, Dict[str, str]], Dict[str, Dict[str, str]]]:
    new_requests = {}
    new_responses = {}
    task_request_oneof = "message TaskRequest {\n oneof task {\n"
    task_response_oneof = "message TaskResponse {\n oneof response {\n"

    for idx, func in enumerate(functions, start=1):
        sig = inspect.signature(func)
        func_name = to_camel_case(func.__name__.capitalize())

        request_message, response_message, request_fields, response_fields = generate_message_definitions(func_name, sig)

        new_requests[func_name] = request_fields
        new_responses[func_name] = response_fields

        task_request_oneof += f" {func_name}Request {func.__name__} = {idx};\n"
        task_response_oneof += f" {func_name}Response {func.__name__} = {idx};\n"

    task_request_oneof += " }\n}\n"
    task_response_oneof += " }\n}\n"

    return new_requests, new_responses

def generate_protobuf_definitions(functions: Tuple[Dict[str, Dict[str, str]], Dict[str, Dict[str, str]]]) -> str:
    proto_definitions = ""
    task_request_oneof = "message TaskRequest {\n oneof task {\n"
    task_response_oneof = "message TaskResponse {\n oneof response {\n"
    
    for idx, (func_name, request_fields) in enumerate(functions[0].items(), start=1):
        request_message = f"message {func_name}Request {{\n"
        for field_name, field_type in request_fields.items():
            request_message += f" {field_type} {field_name} = {idx};\n"
        request_message += "}\n\n"
        proto_definitions += request_message
        task_request_oneof += f" {func_name}Request {func_name} = {idx};\n"
        
    for idx, (func_name, response_fields) in enumerate(functions[1].items(), start=1):
        response_message = f"message {func_name}Response {{\n"
        for field_name, field_type in response_fields.items():
            response_message += f" {field_type} {field_name} = {idx};\n"
        response_message += "}\n\n"
        proto_definitions += response_message
        task_response_oneof += f" {func_name}Response {func_name} = {idx};\n"
        
    task_request_oneof += " }\n}\n"
    task_response_oneof += " }\n}\n"
    
    proto_definitions += task_request_oneof + task_response_oneof
    
    return proto_definitions

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

def combine_and_verify_definitions(existing_requests: Dict[str, Dict[str, str]], 
                                   existing_responses: Dict[str, Dict[str, str]],
                                   new_requests: Dict[str, Dict[str, str]], 
                                   new_responses: Dict[str, Dict[str, str]]) -> Tuple[Dict[str, Dict[str, str]], Dict[str, Dict[str, str]]]:
    combined_requests = existing_requests.copy()
    combined_responses = existing_responses.copy()

    for func_name, new_request in new_requests.items():
        if func_name in combined_requests:
            if combined_requests[func_name] != new_request:
                raise ValueError(f"Inconsistency detected in request for function {func_name}")
        else:
            combined_requests[func_name] = new_request

    for func_name, new_response in new_responses.items():
        if func_name in combined_responses:
            if combined_responses[func_name] != new_response:
                raise ValueError(f"Inconsistency detected in response for function {func_name}")
        else:
            combined_responses[func_name] = new_response

    return combined_requests, combined_responses

# Main execution
if __name__ == "__main__":
    file_path = "tasks.proto"
    existing_content = read_protobuf_file(file_path)
    package, existing_requests, existing_responses = parse_existing_definitions(existing_content)
    print(existing_requests)
    new_requests, new_responses = generate_function_dict(functions)
    
    try:
        combined_requests, combined_responses = combine_and_verify_definitions(
            existing_requests, existing_responses, new_requests, new_responses)
        
        print(generate_protobuf_definitions((combined_requests, combined_responses)))

    except ValueError as e:
        print(f"Error: {e}")
        print("Protobuf file was not updated due to inconsistencies.")