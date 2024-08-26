from tasks.task import Task
from tasks.file import FileReference
from random import randint
import io
import torch
from PIL import Image
from typing import Any
from diffusers import AutoPipelineForImage2Image, DDPMScheduler
from diffusers.pipelines.stable_diffusion_xl.pipeline_stable_diffusion_xl_img2img import retrieve_timesteps
from diffusers.schedulers.scheduling_ddim import DDIMSchedulerOutput
from functools import partial

# https://betterze.github.io/TurboEdit/ -- thank you!
# https://huggingface.co/spaces/turboedit/turbo_edit/tree/main
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

    @staticmethod
    def deterministic_ddpm_step(model_output, timestep, sample, eta, use_clipped_model_output, generator, variance_noise, return_dict, scheduler):
        t = timestep
        prev_t = scheduler.previous_timestep(t)
        alpha_prod_t = scheduler.alphas_cumprod[t]
        alpha_prod_t_prev = scheduler.alphas_cumprod[prev_t] if prev_t >= 0 else scheduler.one
        beta_prod_t = 1 - alpha_prod_t
        beta_prod_t_prev = 1 - alpha_prod_t_prev
        current_alpha_t = alpha_prod_t / alpha_prod_t_prev
        current_beta_t = 1 - current_alpha_t

        if scheduler.config.prediction_type == "epsilon":
            pred_original_sample = (sample - beta_prod_t ** (0.5) * model_output) / alpha_prod_t ** (0.5)
        elif scheduler.config.prediction_type == "sample":
            pred_original_sample = model_output
        elif scheduler.config.prediction_type == "v_prediction":
            pred_original_sample = (alpha_prod_t**0.5) * sample - (beta_prod_t**0.5) * model_output
        else:
            raise ValueError(f"Unsupported prediction_type: {scheduler.config.prediction_type}")

        if scheduler.config.thresholding:
            pred_original_sample = scheduler._threshold_sample(pred_original_sample)
        elif scheduler.config.clip_sample:
            pred_original_sample = pred_original_sample.clamp(-scheduler.config.clip_sample_range, scheduler.config.clip_sample_range)

        pred_original_sample_coeff = (alpha_prod_t_prev ** (0.5) * current_beta_t) / beta_prod_t
        current_sample_coeff = current_alpha_t ** (0.5) * beta_prod_t_prev / beta_prod_t

        pred_prev_sample = pred_original_sample_coeff * pred_original_sample + current_sample_coeff * sample

        return pred_prev_sample

    @staticmethod
    def normalize(z_t, i, max_norm_zs):
        max_norm = max_norm_zs[i]
        if max_norm < 0:
            return z_t, 1
        norm = torch.norm(z_t)
        if norm < max_norm:
            return z_t, 1
        coeff = max_norm / norm
        z_t = z_t * coeff
        return z_t, coeff

    @staticmethod
    def step_save_latents(self, model_output, timestep, sample, eta, use_clipped_model_output, generator, variance_noise, return_dict):
        timestep_index = self._inner_index
        next_timestep_index = timestep_index + 1
        u_hat_t = self.deterministic_ddpm_step(model_output, timestep, sample, eta, use_clipped_model_output, generator, variance_noise, return_dict, self.pipeline.scheduler)
        x_t_minus_1 = self.x_ts[timestep_index]
        self.x_ts_c_hat.append(u_hat_t)
        
        z_t = x_t_minus_1 - u_hat_t
        self.latents.append(z_t)

        z_t, _ = self.normalize(z_t, timestep_index, [-1, -1, -1, 15.5])
        x_t_minus_1_predicted = u_hat_t + z_t

        if not return_dict:
            return (x_t_minus_1_predicted,)

        return DDIMSchedulerOutput(prev_sample=x_t_minus_1, pred_original_sample=None)

    @staticmethod
    def step_use_latents(self, model_output, timestep, sample, eta, use_clipped_model_output, generator, variance_noise, return_dict):
        timestep_index = self._inner_index
        next_timestep_index = timestep_index + 1
        z_t = self.latents[timestep_index]

        _, normalize_coefficient = self.normalize(z_t, timestep_index, [-1, -1, -1, 15.5])

        if normalize_coefficient == 0:
            eta = 0

        x_t_hat_c_hat = self.deterministic_ddpm_step(model_output, timestep, sample, eta, use_clipped_model_output, generator, variance_noise, return_dict, self.pipeline.scheduler)

        w1 = self.ws1[timestep_index]
        w2 = self.ws2[timestep_index]

        x_t_minus_1_exact = self.x_ts[timestep_index]
        x_t_minus_1_exact = x_t_minus_1_exact.expand_as(x_t_hat_c_hat)

        x_t_c_hat = self.x_ts_c_hat[timestep_index]

        x_t_c = x_t_c_hat[0].expand_as(x_t_hat_c_hat)
        
        zero_index_reconstruction = 0
        edit_prompts_num = (model_output.size(0) - zero_index_reconstruction) // 2
        x_t_hat_c_indices = (zero_index_reconstruction, edit_prompts_num + zero_index_reconstruction)
        edit_images_indices = (edit_prompts_num + zero_index_reconstruction, model_output.size(0))
        x_t_hat_c = torch.zeros_like(x_t_hat_c_hat)
        x_t_hat_c[edit_images_indices[0] : edit_images_indices[1]] = x_t_hat_c_hat[x_t_hat_c_indices[0] : x_t_hat_c_indices[1]]
        v1 = x_t_hat_c_hat - x_t_hat_c
        v2 = x_t_hat_c - normalize_coefficient * x_t_c

        x_t_minus_1 = normalize_coefficient * x_t_minus_1_exact + w1 * v1 + w2 * v2

        x_t_minus_1[x_t_hat_c_indices[0] : x_t_hat_c_indices[1]] = x_t_minus_1[edit_images_indices[0] : edit_images_indices[1]]

        if not return_dict:
            return (x_t_minus_1,)

        return DDIMSchedulerOutput(prev_sample=x_t_minus_1, pred_original_sample=None)

    @classmethod
    async def execute(self,
                      input_image: FileReference,
                      src_prompt: str,
                      tgt_prompt: str,
                      seed: int = 7865,
                      w1: float = 1.5,
                      send_update: Any = None
                      ) -> FileReference:
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
        x_ts_c_hat = [None]

        # Custom scheduler setup
        class CustomDDPMScheduler(DDPMScheduler):
            def step(self, *args, **kwargs):
                res_inv = self.step_save_latents(*args, **kwargs)
                res_inf = self.step_use_latents(*args, **kwargs)
                self._inner_index += 1
                return (torch.cat((res_inv[0], res_inf[0]), dim=0),)

        custom_scheduler = CustomDDPMScheduler.from_config(self.pipeline.scheduler.config)
        custom_scheduler.x_ts = x_ts
        custom_scheduler.x_ts_c_hat = x_ts_c_hat
        custom_scheduler.latents = latents
        custom_scheduler.ws1 = [w1] * 4
        custom_scheduler.ws2 = [1.0] * 4
        custom_scheduler._inner_index = 0
        custom_scheduler.step_save_latents = partial(self.step_save_latents, custom_scheduler)
        custom_scheduler.step_use_latents = partial(self.step_use_latents, custom_scheduler)

        self.pipeline.scheduler = custom_scheduler

        latent = latents[0].expand(3, -1, -1, -1)
        prompt = [src_prompt, src_prompt, tgt_prompt]
        
        image = self.pipeline(
            image=latent,
            prompt=prompt,
            eta=1,
            num_inference_steps=num_steps_inversion,
            guidance_scale=0,
            generator=generator,
            denoising_start=denoising_start,
            strength=0
        ).images[2]

        # Create a File object with a unique filename
        file = FileReference(f"turbo_edit_{randint(1000, 9999)}.png")

        # Save the image to a bytes buffer
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)

        # Write the image data to the file
        file.write(img_byte_arr.getvalue())

        return file