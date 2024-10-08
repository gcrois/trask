from tasks.task import Task
from tasks.file import FileReference
from PIL import Image, ImageDraw, ImageFont
from random import randint
import io
from uuid import uuid4

class Text2Imagefile(Task):
    def __init__(self):
        super().__init__()
        self.add_task(self.execute, "Text2Imagefile", exclude_params=["send_update"])

    @classmethod
    def load(self):
        print("Loading text2image...")

    @classmethod
    def unload(self):
        print("Unloading text2image...")

    @classmethod
    async def execute(self,
                      prompt: str,
                      send_update = None
                     ) -> FileReference:
        image = Image.new('RGB', (512, 512), (randint(0, 255), randint(0, 255), randint(0, 255)))
        draw = ImageDraw.Draw(image)
        font = ImageFont.load_default()
        text_color = (255 - image.getpixel((0, 0))[0],
                      255 - image.getpixel((0, 0))[1],
                      255 - image.getpixel((0, 0))[2])
        draw.text((10, 10), prompt, font=font, fill=text_color)

        file = FileReference(f"text2image_{uuid4()}.png")
        
        # Save the image to a bytes buffer
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        # Write the image data to the file
        file.write(img_byte_arr.getvalue())

        return file