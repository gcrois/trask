from tasks.task import Task
from tasks.file import File
from random import randint
import io
import torch
from diffusers import FluxPipeline
from PIL import Image
from typing import Any

class Text2Image(Task):
    def __init__(self):
        super().__init__()
        self.pipe = None
        self.add_task(self.execute, "Text2Image", exclude_params=["send_update"])

    @classmethod
    def load(self):
        print("Loading Text2Image model...")
        self.pipe = FluxPipeline.from_pretrained("black-forest-labs/FLUX.1-schnell", torch_dtype=torch.bfloat16)
        self.pipe.enable_sequential_cpu_offload()

    @classmethod
    def unload(self):
        print("Unloading Text2Image model...")
        self.pipe = None

    @classmethod
    async def execute(self,
                      prompt: str,
                      size: str = "1024x1024",
                      seed: int = 0,
                      send_update: Any = None
                     ) -> File:
        if self.pipe is None:
            raise Exception("Model not loaded")

        # if send_update:
        #     await send_update("Generating image...")

        if seed == 0:
            seed = randint(0, 2**32 - 1)

        steps = 2

        # https://huggingface.co/docs/diffusers/en/using-diffusers/callback
        def callback(pipe, step, timestep, callback_kwargs):
            print(f"Step {step}/{steps}")
            # if send_update:
            #     send_update(f"Step {step}/{steps}")

        width, height = map(int, size.split("x"))
        
        generator = torch.Generator("cuda" if torch.cuda.is_available() else "cpu")
        image = self.pipe(
            prompt,
            guidance_scale=2.0,
            num_inference_steps=steps,
            max_sequence_length=256,
            height=height,
            width=width,
            generator=generator.manual_seed(seed),
            # callback_on_step_end=callback
        ).images[0]

        # Create a File object with a unique filename
        file = File(f"text2image_{randint(1000, 9999)}.png")
        
        # Save the image to a bytes buffer
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        # Write the image data to the file
        file.write(img_byte_arr.getvalue())

        # if send_update:
        #     await send_update(f"Image created and saved as {file.filename}")

        return file