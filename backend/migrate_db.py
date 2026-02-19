
from app import app, db
from sqlalchemy import text

def migrate():
    with app.app_context():
        # Check if column exists (naive check)
        try:
            with db.engine.connect() as conn:
                # For MySQL
                conn.execute(text("ALTER TABLE invoice ADD COLUMN invoice_details TEXT"))
                print("Migration successful: Added invoice_details column.")
        except Exception as e:
            print(f"Migration failed (column might already exist or other error): {e}")

if __name__ == "__main__":
    migrate()
