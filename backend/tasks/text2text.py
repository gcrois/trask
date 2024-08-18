from typing import List, Tuple, Callable, Awaitable
from functools import wraps
from tasks.openai_client import client
from tasks.task import Task

def noop(*args, **kwargs):
    print("Noop called", args, kwargs)
    pass

class Text2Text(Task):
    def __init__(self):
        super().__init__()
        self.add_task(self.execute, "Text2Text", exclude_params=["client", "send_update"])
        
    @classmethod
    def load(cls):
        # No specific loading required for this task
        pass

    @classmethod
    def unload(cls):
        # No specific unloading required for this task
        pass

    @classmethod
    async def execute(cls,
        roles: List[str],
        messages: List[str],
        max_tokens: int = 100,
        client = client,
        send_update: Callable[[str], Awaitable[None]] = noop
    ) -> str:
        """
        Generate text based on a given list of messages.
        :param messages: A list of tuples, where each tuple contains (role, content)
        :param max_tokens: Maximum number of tokens in the response
        :param client: OpenAI client (excluded from protobuf)
        :param send_update: Function to send incremental updates (excluded from protobuf)
        :return: Generated text response
        """
        
        formatted_messages = [
            {"role": "system", "content": "You are a helpful assistant."}
        ]
        for role, content in zip(roles, messages):
            formatted_messages.append({"role": role, "content": content})
        
        await send_update("Sending request to OpenAI")
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=formatted_messages,
            max_tokens=max_tokens,
        )
        
        if not response.choices[0].message.content:
            return "ERROR: No response from the model."
        else:
            result = response.choices[0].message.content
            return result
