import os
import importlib
import sys

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from protobuf_generator import generate_protobuf_definitions

def import_all_proto_files():
    tasks_dir = './tasks'
    sys.path.append(os.path.abspath(tasks_dir))
    for filename in os.listdir(tasks_dir):
        if filename.endswith('.py') and filename != '__init__.py':
            module_name = filename[:-3]  # Remove .py extension
            importlib.import_module(module_name)

def main():
    import_all_proto_files()
    proto_definitions = generate_protobuf_definitions()
    
    with open('generated_proto.proto', 'w') as f:
        f.write('syntax = "proto3";\n\n')
        f.write('package ai_tasks;\n\n')
        f.write(proto_definitions)

    print("Proto file generated successfully: generated_proto.proto")

if __name__ == "__main__":
    main()