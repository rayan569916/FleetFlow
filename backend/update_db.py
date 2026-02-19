from app import app, db
from sqlalchemy import text

with app.app_context():
    # 1. Create new tables (Shipment)
    db.create_all()
    print("Created new tables (if any).")

    # 2. Add column to existing table (Invoice)
    try:
        # Check if column exists strictly via SQL is hard in raw generic SQL without specific dialect queries usually,
        # but we can just try to add it and catch error if it exists, or check information_schema.
        # Simple approach: Try ADD COLUMN, ignore if duplicate.
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE invoice ADD COLUMN tracking_number VARCHAR(50)"))
            print("Added tracking_number column to invoice table.")
    except Exception as e:
        print(f"Column might already exist or error: {e}")
