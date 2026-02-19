from app import app, db, User
import mysql.connector

def init_db():
    # Create database if it doesn't exist
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="admin",
            password="admin"
        )
        cursor = conn.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS fleetflow_db")
        cursor.close()
        conn.close()
        print("Database 'fleetflow_db' check/creation successful.")
    except mysql.connector.Error as err:
        print(f"Error creating database: {err}")
        return

    with app.app_context():
        # Create database tables
        db.create_all()
        print("Database tables created.")

        # Check if Super Admin exists
        if not User.query.filter_by(username='admin').first():
            print("Seeding Super Admin user...")
            super_admin = User(username='admin', role='super_admin', full_name='System Admin')
            super_admin.set_password('admin123') 
            db.session.add(super_admin)
            db.session.commit()
            print("Super Admin user created: username='admin', password='admin123'")
        else:
            print("Super Admin user already exists.")

        # Seed user from screenshot for convenience
        if not User.query.filter_by(username='a@a.com').first():
            print("Seeding Dev User 'a@a.com'...")
            dev_user = User(username='a@a.com', role='cec', full_name='Dev User') # defaulting role to CEO/SuperAdmin equiv
            dev_user.role = 'super_admin' # Override to ensure access
            dev_user.set_password('12345678') # Assuming a simple password was used, or set default
            db.session.add(dev_user)
            db.session.commit()
            print("Dev user created: username='a@a.com', password='12345678'")
        else:
            print("Dev user 'a@a.com' already exists.")

        # Seed Financial Data
        from app import Purchase, Receipt, Payment, Driver, Tracking, LiveTracking
        import datetime

        if not Purchase.query.first():
            print("Seeding Purchases...")
            db.session.add(Purchase(item_name="Fuel - 500L", vendor="Shell Station", amount=1250.00, date=datetime.date.today(), status="Completed"))
            db.session.add(Purchase(item_name="Tire Replacement", vendor="Michelin", amount=800.00, date=datetime.date.today(), status="Pending"))
            db.session.commit()

        if not Receipt.query.first():
            print("Seeding Receipts...")
            db.session.add(Receipt(receipt_number="REC-001", amount=450.00, date=datetime.date.today(), description="Office Supplies"))
            db.session.commit()

        if not Payment.query.first():
            print("Seeding Payments...")
            db.session.add(Payment(payment_method="Credit Card", amount=2000.00, date=datetime.date.today(), status="Processed", reference_id="TXN-12345"))
            db.session.commit()

        # Seed Fleet Data
        if not Driver.query.first():
            print("Seeding Drivers...")
            d1 = Driver(name="John Doe", license_number="DL-1001", status="Active", contact_number="+123456789", assigned_vehicle="Volvo FH16")
            d2 = Driver(name="Jane Smith", license_number="DL-1002", status="On Leave", contact_number="+987654321", assigned_vehicle="Mercedes Actros")
            db.session.add(d1)
            db.session.add(d2)
            db.session.commit()
            
            # Seed Live Tracking for John Doe
            print("Seeding Live Tracking...")
            db.session.add(LiveTracking(driver_id=d1.id, latitude=52.5200, longitude=13.4050, speed=65.0, heading=90.0)) # Berlin
            db.session.add(LiveTracking(driver_id=d2.id, latitude=48.8566, longitude=2.3522, speed=0.0, heading=0.0))   # Paris
            db.session.commit()

        if not Tracking.query.first():
            print("Seeding Tracking...")
            db.session.add(Tracking(tracking_number="TRK-987654321", status="In Transit", origin="Berlin", destination="Paris", estimated_delivery=datetime.date.today() + datetime.timedelta(days=2), current_location="Frankfurt"))
            db.session.commit()

if __name__ == '__main__':
    init_db()
