from protobuf_generator import proto
from tasks.openai_client import client

from io import BytesIO
from base64 import b64encode

import torch
from diffusers import FluxPipeline

pipe = FluxPipeline.from_pretrained("black-forest-labs/FLUX.1-schnell", torch_dtype=torch.bfloat16)
pipe.enable_sequential_cpu_offload()

@proto
async def text2image(prompt: str, n: int = 1, size: str = "1024x1024", send_update=None) -> str:
    out = BytesIO()
    image = pipe(
        prompt,
        guidance_scale=0.0,
        num_inference_steps=2,
        max_sequence_length=256,
        # generator=torch.Generator("cpu").manual_seed(0)
    ).images[0]
    
    image.save(out, format="JPEG")
    return b64encode(out.getvalue()).decode("utf-8")
