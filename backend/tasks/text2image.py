from protobuf_generator import proto
from tasks.openai_client import client

@proto
def text2image(prompt: str, n: int = 1, size: str = "1024x1024", client=client) -> str:
    """Generate an image based on a text prompt."""
    response = client.images.generate(
        prompt=prompt,
        n=n,
        size=size
    )
    return response.data[0].url