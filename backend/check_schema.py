
from app import app, db
from sqlalchemy import inspect

def check_schema():
    with app.app_context():
        inspector = inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('invoice')]
        print(f"Invoice table columns: {columns}")
        
        if 'invoice_details' in columns:
            print("SUCCESS: invoice_details column found.")
        else:
            print("FAILURE: invoice_details column MISSING.")

        # Try a query
        try:
            from app import Invoice
            invs = Invoice.query.all()
            print(f"Query successful. Found {len(invs)} invoices.")
        except Exception as e:
            print(f"Query FAILED: {e}")

if __name__ == "__main__":
    check_schema()
