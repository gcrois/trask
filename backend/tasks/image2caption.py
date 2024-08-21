from typing import Callable, Awaitable
from tasks.task import Task
from tasks.file import File
from tasks.openai_client import client
import base64

def noop(*args, **kwargs):
    print("Noop called", args, kwargs)
    pass

class Image2Caption(Task):
    def __init__(self):
        super().__init__()
        self.add_task(self.execute, "Image2Caption", exclude_params=["client", "send_update"])

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
                      image: File,
                      tokens: int = 100,
                      client=client,
                      send_update: Callable[[str], Awaitable[None]] = noop
                      ) -> str:
        """
        Generate a caption for a given image file using GPT-4 Vision.
        :param image_file: File object containing the image
        :param max_tokens: Maximum number of tokens in the response
        :param client: OpenAI client (excluded from protobuf)
        :param send_update: Function to send incremental updates (excluded from protobuf)
        :return: Generated caption for the image
        """
        print(f"Image2Caption: Processing {image.filename}")

        await send_update("Generating caption for the image")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Provide a detailed caption for this image."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image.to_base64()}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=tokens
        )

        if not response.choices[0].message.content:
            return "ERROR: No caption generated for the image."
        else:
            caption = response.choices[0].message.content
            return caption