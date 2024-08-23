from tasks.task import Task
from tasks.file import File
from random import randint
import io
import torch
from PIL import Image
from typing import Any
from diffusers import AutoPipelineForImage2Image, DDPMScheduler
from diffusers.pipelines.stable_diffusion_xl.pipeline_stable_diffusion_xl_img2img import retrieve_timesteps
from diffusers.schedulers.scheduling_ddim import DDIMSchedulerOutput
from uuid import uuid4

class TurboEdit(Task):
    def __init__(self):
        super().__init__()
        self.pipeline = None
        self.add_task(self.execute, "TurboEdit", exclude_params=["send_update"])

    @classmethod
    def load(self):
        print("Loading TurboEdit model...")
        self.pipeline = AutoPipelineForImage2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.float16, variant="fp16", safety_checker=None)
        self.pipeline = self.pipeline.to("cuda" if torch.cuda.is_available() else "cpu")
        self.pipeline.scheduler = DDPMScheduler.from_pretrained(
            'stabilityai/sdxl-turbo',
            subfolder="scheduler",
        )

    @classmethod
    def unload(self):
        print("Unloading TurboEdit model...")
        self.pipeline = None

    @staticmethod
    def encode_image(image, pipe):
        image = pipe.image_processor.preprocess(image)
        image = image.to(device=pipe.device, dtype=pipe.dtype)
        init_latents = pipe.vae.encode(image).latent_dist.sample()
        init_latents = 0.18215 * init_latents
        return init_latents

    @staticmethod
    def create_xts(noise_shift_delta, generator, scheduler, timesteps, x_0, no_add_noise=False):
        noising_delta = noise_shift_delta * (timesteps[0] - timesteps[1])
        noise_timesteps = [timestep - int(noising_delta) for timestep in timesteps]
        noise_timesteps = noise_timesteps[:3]
        x_0_expanded = x_0.expand(len(noise_timesteps), -1, -1, -1)
        noise = torch.randn(x_0_expanded.size(), generator=generator, device=x_0.device, dtype=x_0.dtype)
        x_ts = scheduler.add_noise(x_0_expanded, noise, torch.IntTensor(noise_timesteps))
        x_ts = [t.unsqueeze(dim=0) for t in list(x_ts)]
        x_ts += [x_0]
        return x_ts

    @classmethod
    async def execute(self,
                      input_image: File,
                      src_prompt: str,
                      tgt_prompt: str,
                      seed: int = 7865,
                      w1: float = 1.5,
                      send_update: Any = None
                      ) -> File:
        if self.pipeline is None:
            raise Exception("Model not loaded")

        device = "cuda" if torch.cuda.is_available() else "cpu"
        generator = torch.Generator(device).manual_seed(seed)

        x_0_image = Image.open(input_image.path).convert("RGB").resize((512, 512), Image.LANCZOS)
        x_0 = self.encode_image(x_0_image, self.pipeline)

        num_steps_inversion = 5
        denoising_start = 0.2
        timesteps, num_inference_steps = retrieve_timesteps(
            self.pipeline.scheduler, num_steps_inversion, device, None
        )
        timesteps, num_inference_steps = self.pipeline.get_timesteps(
            num_inference_steps=num_inference_steps,
            device=device,
            denoising_start=denoising_start,
            strength=0,
        )
        timesteps = timesteps.type(torch.int64)

        x_ts = self.create_xts(1, generator, self.pipeline.scheduler, timesteps, x_0)
        x_ts = [xt.to(dtype=torch.float16) for xt in x_ts]
        latents = [x_ts[0]]
        
        # Implement the core logic of TurboEdit here
        # This would include the step_save_latents and step_use_latents functions
        # as well as the custom scheduler logic

        latent = latents[0].expand(3, -1, -1, -1)
        prompt = [src_prompt, src_prompt, tgt_prompt]
        
        image = self.pipeline(image=latent, prompt=prompt, eta=1, num_inference_steps=num_steps_inversion,
                              guidance_scale=0, generator=generator, denoising_start=denoising_start, strength=0).images[2]

        # Create a File object with a unique filename
        file = File(f"turbo_edit_{uuid4()}.png")

        # Save the image to a bytes buffer
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)

        # Write the image data to the file
        file.write(img_byte_arr.getvalue())

        return file