from sqlalchemy import inspect, text
from app import create_app
from extensions import db

TABLES_WITH_OFFICE = [
    "purchases",
    "receipts",
    "payments",
    "daily_reports",
    "invoice_headers",
    "reports",
    "shipments",
    "drivers",
    "trackings",
    "live_tracking",
]


def has_column(inspector, table_name, column_name):
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def add_office_column_if_missing(conn, inspector, table_name):
    if has_column(inspector, table_name, "office_id"):
        print(f"[OK] {table_name}.office_id already exists")
        return

    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN office_id INT NULL"))
    print(f"[MIGRATED] Added office_id to {table_name}")


def migrate():
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        dialect = db.engine.dialect.name

        with db.engine.begin() as conn:
            for table_name in TABLES_WITH_OFFICE:
                add_office_column_if_missing(conn, inspector, table_name)

            default_office_id = conn.execute(text("SELECT MIN(id) FROM offices")).scalar()
            if not default_office_id:
                raise RuntimeError("No offices found. Seed offices before running this migration.")

            # Backfill existing rows
            conn.execute(
                text(
                    """
                    UPDATE invoice_headers ih
                    LEFT JOIN users u ON u.id = ih.creator_id
                    SET ih.office_id = COALESCE(ih.office_id, u.office_id, :default_office_id)
                    """
                ),
                {"default_office_id": default_office_id},
            )
            conn.execute(
                text(
                    "UPDATE purchases SET office_id = COALESCE(office_id, :default_office_id)"
                ),
                {"default_office_id": default_office_id},
            )
            conn.execute(
                text(
                    "UPDATE receipts SET office_id = COALESCE(office_id, :default_office_id)"
                ),
                {"default_office_id": default_office_id},
            )
            conn.execute(
                text(
                    "UPDATE payments SET office_id = COALESCE(office_id, :default_office_id)"
                ),
                {"default_office_id": default_office_id},
            )
            conn.execute(
                text(
                    "UPDATE daily_reports SET office_id = COALESCE(office_id, :default_office_id)"
                ),
                {"default_office_id": default_office_id},
            )
            conn.execute(
                text(
                    "UPDATE reports SET office_id = COALESCE(office_id, :default_office_id)"
                ),
                {"default_office_id": default_office_id},
            )
            conn.execute(
                text(
                    "UPDATE shipments SET office_id = COALESCE(office_id, :default_office_id)"
                ),
                {"default_office_id": default_office_id},
            )
            conn.execute(
                text(
                    "UPDATE drivers SET office_id = COALESCE(office_id, :default_office_id)"
                ),
                {"default_office_id": default_office_id},
            )
            conn.execute(
                text(
                    "UPDATE trackings SET office_id = COALESCE(office_id, :default_office_id)"
                ),
                {"default_office_id": default_office_id},
            )
            conn.execute(
                text(
                    """
                    UPDATE live_tracking lt
                    LEFT JOIN drivers d ON d.id = lt.driver_id
                    SET lt.office_id = COALESCE(lt.office_id, d.office_id, :default_office_id)
                    """
                ),
                {"default_office_id": default_office_id},
            )

            if dialect == "mysql":
                # Tighten to NOT NULL + FK relations for MySQL.
                for table_name in TABLES_WITH_OFFICE:
                    conn.execute(text(f"ALTER TABLE {table_name} MODIFY COLUMN office_id INT NOT NULL"))
                    fk_name = f"fk_{table_name}_office_id"
                    try:
                        conn.execute(
                            text(
                                f"""
                                ALTER TABLE {table_name}
                                ADD CONSTRAINT {fk_name}
                                FOREIGN KEY (office_id) REFERENCES offices(id)
                                """
                            )
                        )
                    except Exception:
                        pass

                # Daily report is unique per office per date.
                try:
                    conn.execute(
                        text(
                            """
                            ALTER TABLE daily_reports
                            ADD CONSTRAINT uq_daily_reports_date_office UNIQUE (date, office_id)
                            """
                        )
                    )
                except Exception:
                    pass

        print("Office scope migration completed.")


if __name__ == "__main__":
    migrate()
