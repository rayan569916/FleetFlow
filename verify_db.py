import sys
import os

# Add the current directory to sys.path to import backend modules
sys.path.append(os.getcwd())

from backend.app import app
from backend.extensions import db
from sqlalchemy import inspect

def verify():
    with app.app_context():
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print(f"Tables: {tables}")
        
        if 'country' in tables:
            print("Country columns:", [c['name'] for c in inspector.get_columns('country')])
        else:
            print("Country table MISSING")
            
        if 'unit_price' in tables:
            print("Unit_price columns:", [c['name'] for c in inspector.get_columns('unit_price')])
        else:
            print("Unit_price table MISSING")

if __name__ == "__main__":
    verify()
