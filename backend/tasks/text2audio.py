import torch
import soundfile as sf
from diffusers import StableAudioPipeline
from io import BytesIO
from random import randint
from typing import Any
from tasks.task import Task
from tasks.file import File
from uuid import uuid4

class Text2Audio(Task):
    def __init__(self):
        super().__init__()
        self.pipe = None
        self.add_task(self.execute, "Text2Audio", exclude_params=["send_update"])

    @classmethod
    def load(self):
        print("Loading Text2Audio model...")
        self.pipe = StableAudioPipeline.from_pretrained("stabilityai/stable-audio-open-1.0", torch_dtype=torch.float16)
        self.pipe = self.pipe.to("cuda" if torch.cuda.is_available() else "cpu")

    @classmethod
    def unload(self):
        print("Unloading Text2Audio model...")
        self.pipe = None

    @classmethod
    async def execute(self,
                      prompt: str,
                      negative_prompt: str = "Low quality.",
                      duration: float = 10.0,
                      num_inference_steps: int = 100,
                      num_waveforms: int = 1,
                      seed: int = 0,
                      send_update: Any = None
                      ) -> File:
        """
        Generate audio from a text prompt using the Stable Audio model.
        Args:
        prompt (str): The text description of the audio to generate.
        negative_prompt (str, optional): Negative prompt for generation. Defaults to "Low quality."
        duration (float, optional): The duration of the audio in seconds. Defaults to 10.0.
        num_inference_steps (int, optional): The number of inference steps. Defaults to 200.
        num_waveforms (int, optional): Number of waveforms to generate. Defaults to 1.
        seed (int, optional): Seed for the random generator. If None, a random seed will be used.
        send_update (callable, optional): A function to send progress updates. Defaults to None.
        Returns:
        File: File object containing the generated audio in WAV format.
        """
        if self.pipe is None:
            raise Exception("Model not loaded")

        # if send_update:
        #     await send_update("Generating audio...")

        generator = torch.Generator("cuda" if torch.cuda.is_available() else "cpu")
        if seed == 0:
            seed = randint(0, 2**32 - 1)

        audio = self.pipe(
            prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=num_inference_steps,
            audio_end_in_s=duration,
            num_waveforms_per_prompt=num_waveforms,
            generator=generator.manual_seed(seed)
        ).audios

        output = audio[0].T.float().cpu().numpy()

        # Save to BytesIO object
        buffer = BytesIO()
        sf.write(buffer, output, self.pipe.vae.sampling_rate, format="wav")
        buffer.seek(0)

        # Create a File object with a unique filename
        file = File(f"text2audio_{uuid4()}.wav")
        
        # Write the audio data to the file
        file.write(buffer.getvalue())

        # if send_update:
        #     await send_update(f"Audio created and saved as {file.filename}")

        return file