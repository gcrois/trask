import torch
import torchaudio
from einops import rearrange
from stable_audio_tools import get_pretrained_model
from stable_audio_tools.inference.generation import generate_diffusion_cond
from base64 import b64encode
from io import BytesIO
from protobuf_generator import proto

device = "cuda:1" if torch.cuda.is_available() else "cpu"

# Download model
model, model_config = get_pretrained_model("stabilityai/stable-audio-open-1.0")
sample_rate = model_config["sample_rate"]
sample_size = model_config["sample_size"]
model = model.to(device)

@proto
async def text2audio(prompt: str, duration: int = 15, steps: int = 100, cfg_scale: float = 7.0, send_update=None) -> str:
    """
    Generate audio from a text prompt using the Stable Audio model.

    Args:
        prompt (str): The text description of the audio to generate.
        duration (int, optional): The duration of the audio in seconds. Defaults to 30.
        steps (int, optional): The number of inference steps. Defaults to 100.
        cfg_scale (float, optional): The classifier-free guidance scale. Defaults to 7.0.
        send_update (callable, optional): A function to send progress updates. Defaults to None.

    Returns:
        str: Base64 encoded string of the generated audio in WAV format.
    """
    conditioning = [{
        "prompt": prompt,
        "seconds_start": 0,
        "seconds_total": duration
    }]
    
    output = generate_diffusion_cond(
        model,
        steps=steps,
        cfg_scale=cfg_scale,
        conditioning=conditioning,
        sample_size=sample_size,
        sigma_min=0.3,
        sigma_max=500,
        sampler_type="dpmpp-3m-sde",
        device=device
    )
    
    output = rearrange(output, "b d n -> d (b n)")
    output = output.to(torch.float32).div(torch.max(torch.abs(output))).clamp(-1, 1).mul(32767).to(torch.int16).cpu()
    
    # Save to BytesIO object
    buffer = BytesIO()
    torchaudio.save(buffer, output, sample_rate, format="wav")
    buffer.seek(0)
    
    # Encode to base64
    audio_b64 = b64encode(buffer.getvalue()).decode("utf-8")
    
    return audio_b64
