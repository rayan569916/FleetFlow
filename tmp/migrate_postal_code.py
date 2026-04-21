
import os
import sys
from sqlalchemy import text

# Add the directory containing app.py to the Python path
backend_dir = os.path.join(os.getcwd(), 'backend')
sys.path.append(backend_dir)

from app import app
from extensions import db

def migrate():
    with app.app_context():
        try:
            # Check if column exists
            result = db.session.execute(text("PRAGMA table_info(invoice_customer_detail)")).fetchall()
            columns = [row[1] for row in result]
            
            if 'consignee_postal_code' not in columns:
                print("Adding consignee_postal_code column...")
                db.session.execute(text("ALTER TABLE invoice_customer_detail ADD COLUMN consignee_postal_code VARCHAR(20)"))
                db.session.commit()
                print("Column added successfully.")
            else:
                print("Column consignee_postal_code already exists.")
                
        except Exception as e:
            print(f"Migration failed: {e}")
            db.session.rollback()

if __name__ == "__main__":
    migrate()
