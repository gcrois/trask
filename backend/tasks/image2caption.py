from typing import Callable, Awaitable
from tasks.task import Task
from tasks.file import File
from tasks.openai_client import client
import base64
from PIL import Image
import io
import os

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

    @staticmethod
    def compress_image(image_path: str, max_size_kb: int = 500) -> str:
        """Compress the image to ensure it's under the specified size."""
        with Image.open(image_path) as img:
            # Convert to RGB if it's not
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Start with quality 95 and reduce until the image is small enough
            quality = 95
            output = io.BytesIO()
            while True:
                output.seek(0)
                output.truncate(0)
                img.save(output, format='JPEG', quality=quality)
                if len(output.getvalue()) <= max_size_kb * 1024 or quality <= 5:
                    break
                quality -= 5

            # Save the compressed image
            compressed_path = f"{os.path.splitext(image_path)[0]}_compressed.jpg"
            with open(compressed_path, 'wb') as f:
                f.write(output.getvalue())
            
            return compressed_path

    @classmethod
    async def execute(cls,
                      image: File,
                      tokens: int = 100,
                      client=client,
                      focus: str = "",
                      send_update: Callable[[str], Awaitable[None]] = noop
                      ) -> str:
        """
        Generate a caption for a given image file using GPT-4 Vision.
        :param image: File object containing the image
        :param tokens: Maximum number of tokens in the response
        :param client: OpenAI client (excluded from protobuf)
        :param focus: Specific aspect of the image to focus on
        :param send_update: Function to send incremental updates (excluded from protobuf)
        :return: Generated caption for the image
        """
        print(f"Image2Caption: Processing {image.filename}")

        # Compress the image
        compressed_image_path = cls.compress_image(image.file_path)
        
        # Read the compressed image file and encode it to base64
        with open(compressed_image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')

        # await send_update("Generating caption for the compressed image")
        system_prompt = "Please provide a detailed caption for this image. Do not provide any surrounding context. Only return a caption for the image."
        if focus:
            system_prompt += f" Pay particular attention to {focus}."

        response = client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=tokens
        )

        # Clean up the compressed image file
        os.remove(compressed_image_path)

        if not response.choices[0].message.content:
            return "ERROR: No caption generated for the image."
        else:
            caption = response.choices[0].message.content
            return caption