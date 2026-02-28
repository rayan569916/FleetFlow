"""
migrate_indexes.py
Run this script ONCE to create the new database indexes defined in the models.
This is safe to run multiple times - existing indexes will be skipped.

Usage:
    .\venv\Scripts\python migrate_indexes.py
"""
from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

INDEX_STATEMENTS = [
    # Finance tables - composite indexes on office_id + created_at for fast daily queries
    "CREATE INDEX IF NOT EXISTS ix_purchases_office_created ON purchases (office_id, created_at)",
    "CREATE INDEX IF NOT EXISTS ix_receipts_office_created ON receipts (office_id, created_at)",
    "CREATE INDEX IF NOT EXISTS ix_payments_office_created ON payments (office_id, created_at)",
    # Invoice headers - composite index on office_id + date for fast date-range filtering
    "CREATE INDEX IF NOT EXISTS ix_invoice_headers_office_date ON invoice_headers (office_id, date)",
    # Individual indexes
    "CREATE INDEX IF NOT EXISTS ix_purchases_created_at ON purchases (created_at)",
    "CREATE INDEX IF NOT EXISTS ix_receipts_created_at ON receipts (created_at)",
    "CREATE INDEX IF NOT EXISTS ix_payments_created_at ON payments (created_at)",
    "CREATE INDEX IF NOT EXISTS ix_invoice_headers_date ON invoice_headers (date)",
    # Daily reports - composite index on office_id + date for catch-up queries
    "CREATE INDEX IF NOT EXISTS ix_daily_reports_office_date ON daily_reports (office_id, date)",
]

with app.app_context():
    with db.engine.connect() as conn:
        for stmt in INDEX_STATEMENTS:
            try:
                conn.execute(text(stmt))
                print(f"OK: {stmt[:60]}...")
            except Exception as e:
                print(f"SKIP ({e}): {stmt[:60]}...")
        conn.commit()
    print("\nIndex migration complete.")
