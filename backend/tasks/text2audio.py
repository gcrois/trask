import torch
import torchaudio
from einops import rearrange
from stable_audio_tools import get_pretrained_model
from stable_audio_tools.inference.generation import generate_diffusion_cond
from tasks.task import Task
from tasks.file import File
from io import BytesIO
from random import randint
from typing import Any

device = "cuda" if torch.cuda.is_available() else "cpu"

class Text2Audio(Task):
    def __init__(self):
        super().__init__()
        self.model = None
        self.model_config = None
        self.sample_rate = None
        self.sample_size = None
        self.add_task(self.execute, "Text2Audio", exclude_params=["send_update"])

    @classmethod
    def load(self):
        print("Loading Text2Audio model...")
        # Download model
        self.model, self.model_config = get_pretrained_model("stabilityai/stable-audio-open-1.0")
        self.sample_rate = self.model_config["sample_rate"]
        self.sample_size = self.model_config["sample_size"]
        self.model = self.model.to(device)

    @classmethod
    def unload(self):
        print("Unloading Text2Audio model...")
        self.model = None
        self.model_config = None
        self.sample_rate = None
        self.sample_size = None

    @classmethod
    async def execute(self, 
                      prompt: str, 
                      duration: int = 15, 
                      steps: int = 100, 
                      cfg_scale: float = 7.0, 
                      send_update: Any = None
                     ) -> File:
        """
        Generate audio from a text prompt using the Stable Audio model.
        Args:
        prompt (str): The text description of the audio to generate.
        duration (int, optional): The duration of the audio in seconds. Defaults to 15.
        steps (int, optional): The number of inference steps. Defaults to 100.
        cfg_scale (float, optional): The classifier-free guidance scale. Defaults to 7.0.
        send_update (callable, optional): A function to send progress updates. Defaults to None.
        Returns:
        File: File object containing the generated audio in WAV format.
        """
        if self.model is None:
            raise Exception("Model not loaded")

        if send_update:
            await send_update("Generating audio...")

        conditioning = [{
            "prompt": prompt,
            "seconds_start": 0,
            "seconds_total": duration
        }]

        output = generate_diffusion_cond(
            self.model,
            steps=steps,
            cfg_scale=cfg_scale,
            conditioning=conditioning,
            sample_size=self.sample_size,
            sigma_min=0.3,
            sigma_max=500,
            sampler_type="dpmpp-3m-sde",
            device=device
        )

        output = rearrange(output, "b d n -> d (b n)")
        output = output.to(torch.float32).div(torch.max(torch.abs(output))).clamp(-1, 1).mul(32767).to(torch.int16).cpu()

        # Save to BytesIO object
        buffer = BytesIO()
        torchaudio.save(buffer, output, self.sample_rate, format="wav")
        buffer.seek(0)

        # Create a File object with a unique filename
        file = File(f"text2audio_{randint(1000, 9999)}.wav")
        
        # Write the audio data to the file
        file.write(buffer.getvalue())

        if send_update:
            await send_update(f"Audio created and saved as {file.filename}")

        return file