from sqlalchemy import inspect, text
from app import create_app
from extensions import db


NEW_COLUMNS = {
    "sender_country_code": "VARCHAR(10) NULL",
    "sender_location_link": "VARCHAR(500) NULL",
    "consignee_country_code": "VARCHAR(10) NULL",
    "consignee_country": "VARCHAR(100) NULL",
    "consignee_city": "VARCHAR(100) NULL",
}


def migrate():
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        existing = {c["name"] for c in inspector.get_columns("invoice_customers")}

        with db.engine.begin() as conn:
            for col, ddl_type in NEW_COLUMNS.items():
                if col in existing:
                    print(f"[OK] invoice_customers.{col} already exists")
                    continue
                conn.execute(
                    text(f"ALTER TABLE invoice_customers ADD COLUMN {col} {ddl_type}")
                )
                print(f"[MIGRATED] Added invoice_customers.{col}")

        print("Invoice customer field migration completed.")


if __name__ == "__main__":
    migrate()
