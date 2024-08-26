import sqlite3
import os
from fastapi import HTTPException
from contextlib import contextmanager

class DatabaseManager:
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = None

    def connect(self):
        if not self.conn:
            self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self.conn.row_factory = sqlite3.Row

    def close(self):
        if self.conn:
            self.conn.close()
            self.conn = None

    @contextmanager
    def get_cursor(self):
        self.connect()
        if not self.conn:
            raise Exception("Database connection is closed")
        
        cursor = self.conn.cursor()
        try:
            yield cursor
            self.conn.commit()
        except Exception:
            self.conn.rollback()
            raise
        finally:
            cursor.close()

    def setup(self):
        with self.get_cursor() as cursor:
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS file_mapping (
                    file_id TEXT PRIMARY KEY,
                    file_path TEXT NOT NULL
                )
            ''')

    def get_file_path(self, file_id: str) -> str:
        with self.get_cursor() as cursor:
            cursor.execute("SELECT file_path FROM file_mapping WHERE file_id = ?", (file_id,))
            result = cursor.fetchone()
        
        if result:
            return result['file_path']
        raise HTTPException(status_code=404, detail=f"File ID {file_id} not found")

    def add_file_mapping(self, file_id: str, file_path: str):
        with self.get_cursor() as cursor:
            cursor.execute("INSERT OR REPLACE INTO file_mapping (file_id, file_path) VALUES (?, ?)", (file_id, file_path))

# Create an instance of the DatabaseManager
file_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'files')
os.makedirs(file_dir, exist_ok=True)
db_path = os.path.join(file_dir, 'id_map.db')
db_manager = DatabaseManager(db_path)

# Setup the database
db_manager.setup()

# Expose the methods we need
get_file_path = db_manager.get_file_path
add_file_mapping = db_manager.add_file_mapping

def close_db_connection():
    db_manager.close()