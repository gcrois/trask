from tasks.task import Task
from tasks.file import File
from random import randint
import io
import torch
from diffusers import StableDiffusionXLPipeline, UNet2DConditionModel, EulerDiscreteScheduler
from huggingface_hub import hf_hub_download
from safetensors.torch import load_file
from PIL import Image
from typing import Any
from uuid import uuid4

class Text2Imagedraft(Task):
    def __init__(self):
        super().__init__()
        self.pipe = None
        self.add_task(self.execute, "Text2Imagedraft", exclude_params=["send_update"])

    @classmethod
    def load(self):
        print("Loading Text2Imagedraft model...")
        base = "stabilityai/stable-diffusion-xl-base-1.0"
        repo = "ByteDance/SDXL-Lightning"
        ckpt = "sdxl_lightning_4step_unet.safetensors"

        unet = UNet2DConditionModel.from_config(base, subfolder="unet").to("cuda", torch.float16)
        unet.load_state_dict(load_file(hf_hub_download(repo, ckpt), device="cuda"))
        
        self.pipe = StableDiffusionXLPipeline.from_pretrained(base, unet=unet, torch_dtype=torch.float16, variant="fp16").to("cuda")
        self.pipe.scheduler = EulerDiscreteScheduler.from_config(self.pipe.scheduler.config, timestep_spacing="trailing")

    @classmethod
    def unload(self):
        print("Unloading Text2Imagedraft model...")
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

        if seed == 0:
            seed = randint(0, 2**32 - 1)

        width, height = map(int, size.split("x"))
        generator = torch.Generator("cuda" if torch.cuda.is_available() else "cpu")

        image = self.pipe(
            prompt,
            num_inference_steps=4,
            guidance_scale=0,
            height=height,
            width=width,
            generator=generator.manual_seed(seed)
        ).images[0]

        # Create a File object with a unique filename
        file = File(f"text2image_draft_{uuid4()}.png")

        # Save the image to a bytes buffer
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)

        # Write the image data to the file
        file.write(img_byte_arr.getvalue())

        return file