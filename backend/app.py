from flask import Flask, request, jsonify
from flask_cors import CORS
from typing import Any, Dict, Optional, Union

app = Flask(__name__)
CORS(app)

@app.route('/handshake', methods=['POST'])
def handshake():
    data: Optional[Dict[str, Any]] = request.json
    if data and data.get('handshake'):
        return jsonify({'status': 'Handshake successful'}), 200
    return jsonify({'error': 'Invalid handshake request'}), 400

@app.route('/execute', methods=['POST'])
def execute_task():
    data: Optional[Dict[str, Any]] = request.json
    if not data:
        return jsonify({'error': 'Invalid request data'}), 400

    task_name: Optional[str] = data.get('taskName')
    input_text: Optional[str] = data.get('input')

    if not task_name or not input_text:
        return jsonify({'error': 'taskName and input are required'}), 400

    if task_name == 'capitalizeText':
        result = input_text.upper()
    elif task_name == 'reverseText':
        result = input_text[::-1]
    else:
        return jsonify({'error': 'Unknown task'}), 400
    
    return jsonify({'result': result})

if __name__ == '__main__':
    app.run(debug=True)
