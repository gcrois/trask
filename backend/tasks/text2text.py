from protobuf_generator import proto
from tasks.openai_client import client
from typing import List, Tuple, Callable, Any
from functools import wraps

def noop(*args, **kwargs):
    pass

def with_updates(func):
    @wraps(func)
    def wrapper(*args, send_update: Callable[[Any], None] = noop, **kwargs):
        if send_update is None:
            send_update = lambda _: None  # No-op if no send_update provided
        
        def wrapped_send_update(update):
            send_update(update)
        
        return func(*args, send_update=wrapped_send_update, **kwargs)
    return wrapper

@proto
@with_updates
def text2text(messages: List[Tuple[str, str]], max_tokens: int = 100, client=client, send_update: Callable[[str], None] = noop) -> str:
    """
    Generate text based on a given list of messages.
    :param messages: A list of tuples, where each tuple contains (role, content)
    :param max_tokens: Maximum number of tokens in the response
    :param client: OpenAI client
    :param send_update: Function to send incremental updates
    :return: Generated text response
    """
    formatted_messages = [
        {"role": "system", "content": "You are a helpful assistant."}
    ]
    for role, content in messages:
        formatted_messages.append({"role": role, "content": content})
        # send_update(f"Processing message: {role}")

    send_update("Sending request to OpenAI")
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=formatted_messages,
        max_tokens=max_tokens,
    )
    
    if not response.choices[0].message.content:
        send_update("Error: No response from the model")
        return "ERROR: No response from the model."
    else:
        result = response.choices[0].message.content
        send_update("Received response from OpenAI")
        return result