from tasks.task import Task
from tasks.file import FileReference
from random import randint
import io
import torch
from diffusers import FluxPipeline, StableDiffusionXLPipeline, UNet2DConditionModel, EulerDiscreteScheduler
from huggingface_hub import hf_hub_download
from safetensors.torch import load_file
from PIL import Image
from typing import Any
from uuid import uuid4
from sd_embed.embedding_funcs import get_weighted_text_embeddings_flux1, get_weighted_text_embeddings_sdxl

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
        print("Text2Image model loaded")

    @classmethod
    def unload(self):
        print("Unloading Text2Image model...")
        self.pipe = None

    @classmethod
    async def execute(self,
                      prompt: str,
                      negative_prompt: str = "",
                      size: str = "1024x1024",
                      seed: int = 0,
                      send_update: Any = None
                      ) -> FileReference:
        if self.pipe is None:
            raise Exception("Model not loaded")

        if seed == 0:
            seed = randint(0, 2**32 - 1)
        
        steps = 2
        width, height = map(int, size.split("x"))
        generator = torch.Generator("cuda" if torch.cuda.is_available() else "cpu")

        # Generate long prompt embeddings
        prompt_embeds, pooled_prompt_embeds = get_weighted_text_embeddings_flux1(
            pipe=self.pipe,
            prompt=prompt,
            neg_prompt=negative_prompt
        )

        image = self.pipe(
            prompt_embeds=prompt_embeds,
            pooled_prompt_embeds=pooled_prompt_embeds,
            guidance_scale=2.0,
            num_inference_steps=steps,
            max_sequence_length=256,
            height=height,
            width=width,
            generator=generator.manual_seed(seed),
        ).images[0]

        file = FileReference(f"text2image_{uuid4()}.png")
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        file.write(img_byte_arr.getvalue())

        return file