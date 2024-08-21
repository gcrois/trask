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
                      image_file: File,
                      max_tokens: int = 100,
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
        print(f"Image2Caption: Processing {image_file.filename}")

        # Read the image file and encode it to base64
        with open(image_file.file_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')

        await send_update("Generating caption for the image")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Please provide a caption for this image."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=max_tokens
        )

        if not response.choices[0].message.content:
            return "ERROR: No caption generated for the image."
        else:
            caption = response.choices[0].message.content
            return caption