from tasks.task import Task

from random import randint

from io import BytesIO
from base64 import b64encode

import torch
from diffusers import FluxPipeline, StableDiffusionPipeline
from typing import Any

class Text2Image(Task):
    def __init__(self):
        super().__init__()
        self.pipe = None
        
        self.add_task(self.execute, "Text2Image", exclude_params=["send_update"])
    
    @classmethod
    def load(self):
        self.pipe = FluxPipeline.from_pretrained("black-forest-labs/FLUX.1-schnell", torch_dtype=torch.bfloat16)
        self.pipe.enable_sequential_cpu_offload()
    
    @classmethod
    def unload(self):
        self.pipe = None        
    
    @classmethod
    async def execute(self,
        prompt: str,
        size: str = "1024x1024",
        seed: int = 0,
        send_update = None
    ) -> str:
        if self.pipe is None:
            raise Exception("Model not loaded")
        
        if seed == 0:
            seed = randint(0, 2 ** 32 - 1)
        
        steps = 2
        # https://huggingface.co/docs/diffusers/en/using-diffusers/callback
        def callback(pipe, step, timestep, callback_kwargs):
            print(f"Step {step}/{steps}")
            # if send_update:
            #     send_update(f"Step {step}/{steps}")
        
        out = BytesIO()
        image = self.pipe(
            prompt,
            guidance_scale=2.0,
            num_inference_steps=2,
            max_sequence_length=256,
            height=int(size.split("x")[0]),
            width=int(size.split("x")[1]),
            generator=torch.Generator("cpu").manual_seed(0),
            # callback_on_step_end=callback
        ).images[0]
        
        image.save(out, format="JPEG")
        return b64encode(out.getvalue()).decode("utf-8")