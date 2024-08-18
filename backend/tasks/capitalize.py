from tasks.task import Task

class Capitalize(Task):
    def __init__(self):
        super().__init__()
        
        self.add_task(self.execute, "capitalize")
        
    @classmethod
    def load(self):
        print("Loading capitalize...")
    
    @classmethod
    def unload(self):
        print("Unloading capitalize...")
    
    @classmethod
    async def execute(self, text: str, send_update) -> str:
        return text.upper()
