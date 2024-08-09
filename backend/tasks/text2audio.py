from protobuf_generator import proto
from tasks.openai_client import client
from typing import List, Tuple

@proto
def text2audio(messages: List[Tuple[str, str]], max_tokens: int = 100, client=client) -> str:
    """
    Generate text based on a given list of messages.
    
    :param messages: A list of tuples, where each tuple contains (role, content)
    :param max_tokens: Maximum number of tokens in the response
    :param client: OpenAI client
    :return: Generated text response
    """

    formatted_messages = [
        {"role": "system", "content": "You are a helpful assistant."}
    ]
    
    for role, content in messages:
        formatted_messages.append({"role": role, "content": content})
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=formatted_messages,
        max_tokens=max_tokens,
    )
    
    if not response.choices[0].message.content:
        return "ERROR: No response from the model."
    else:
        return response.choices[0].message.content