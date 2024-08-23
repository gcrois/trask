from typing import Callable, Awaitable, Literal
from tasks.task import Task
from transformers import T5Tokenizer, T5ForConditionalGeneration

def noop(*args, **kwargs):
    print("Noop called", args, kwargs)
    pass

class Text2Prompt(Task):
    def __init__(self):
        super().__init__()
        self.tokenizer = None
        self.model = None
        self.add_task(self.execute, "Text2Prompt", exclude_params=["send_update"])

    @classmethod
    def load(cls):
        print("Loading Text2Prompt model...")
        cls.tokenizer = T5Tokenizer.from_pretrained("roborovski/superprompt-v1")
        cls.model = T5ForConditionalGeneration.from_pretrained("roborovski/superprompt-v1", device_map="auto")

    @classmethod
    def unload(cls):
        print("Unloading Text2Prompt model...")
        cls.tokenizer = None
        cls.model = None

    @classmethod
    async def execute(cls,
                      prompt: str,
                      max_new_tokens: int = 77,
                      send_update: Callable[[str], Awaitable[Literal['success']]] = noop
                      ) -> str:
        """
        Expand a given prompt to add more detail.
        :param prompt: The input prompt to expand
        :param max_new_tokens: Maximum number of new tokens in the response
        :param send_update: Function to send incremental updates (excluded from protobuf)
        :return: Expanded prompt
        """
        if cls.tokenizer is None or cls.model is None:
            raise Exception("Model not loaded")

        # await send_update("Expanding prompt...")

        input_text = f"Expand the following prompt to add more detail: {prompt}"
        input_ids = cls.tokenizer(input_text, return_tensors="pt").input_ids.to(cls.model.device)

        outputs = cls.model.generate(input_ids, max_new_tokens=max_new_tokens)
        expanded_prompt = cls.tokenizer.decode(outputs[0], skip_special_tokens=True)

        # await send_update("Prompt expanded successfully")

        return expanded_prompt