from tasks.task import Task, File

class Greet(Task):
    def __init__(self):
        super().__init__()
        self.add_task(self.execute, "greet")

    @classmethod
    def load(self):
        print("Loading greet...")

    @classmethod
    def unload(self):
        print("Unloading greet...")

    @classmethod
    async def execute(self, name: str, language: str = "en", send_update=None) -> str:
        greetings = {
            "en": "Hello",
            "es": "Hola",
            "fr": "Bonjour"
        }
        greeting = greetings.get(language, greetings["en"])
        return f"{greeting}, {name}!"