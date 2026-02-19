from app import create_app
from extensions import db
from models import User, Role, Office
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def init_db():
    # Create database if it doesn't exist
    try:
        # Parse DATABASE_URL if exists, else use defaults
        # Simple parsing for mysql+mysqlconnector://user:password@host/db
        db_url = os.environ.get('DATABASE_URL', 'mysql+mysqlconnector://root:root@localhost/fleetflow_db')
        
        # Strip protocol
        url_parts = db_url.split('://')[1]
        # Get credentials and host/db
        creds, rest = url_parts.split('@')
        user, password = creds.split(':')
        host_db = rest.split('/')
        host = host_db[0]
        
        conn = mysql.connector.connect(
            host=host,
            user=user,
            password=password
        )
        cursor = conn.cursor()
        print("Dropping existing database 'fleetflow_db' for a clean start...")
        cursor.execute("DROP DATABASE IF EXISTS fleetflow_db")
        print("Creating database 'fleetflow_db'...")
        cursor.execute("CREATE DATABASE fleetflow_db")
        cursor.close()
        conn.close()
        print("Database 'fleetflow_db' recreated successfully.")
    except mysql.connector.Error as err:
        print(f"Error managing database: {err}")

    with app.app_context():
        # Recreate all tables
        print("Creating all tables in fresh database...")
        db.create_all()
        print("Database tables created.")

        # Create roles if they don't exist
        roles = ['super_admin', 'ceo', 'hr', 'accountant', 'driver', 'staff']
        for role_name in roles:
            if not Role.query.filter_by(name=role_name).first():
                db.session.add(Role(name=role_name))
        db.session.commit()
        print("Roles seeded.")

        # Create offices if they don't exist
        offices_data = [
            {'name': 'Head Office', 'location': 'New York, USA'},
            {'name': 'North Station', 'location': 'Chicago, USA'},
            {'name': 'South Station', 'location': 'Houston, USA'},
            {'name': 'West Coast Hub', 'location': 'Los Angeles, USA'}
        ]
        for office_data in offices_data:
            if not Office.query.filter_by(name=office_data['name']).first():
                db.session.add(Office(name=office_data['name'], location=office_data['location']))
        db.session.commit()
        print("Offices seeded.")

        # Check if Super Admin exists
        admin_role = Role.query.filter_by(name='super_admin').first()
        head_office = Office.query.filter_by(name='Head Office').first()
        if not User.query.filter_by(username='admin').first():
            print("Seeding Super Admin user...")
            super_admin = User(username='admin', role_id=admin_role.id, office_id=head_office.id, full_name='System Admin')
            super_admin.set_password('admin123') 
            db.session.add(super_admin)
            db.session.commit()
            print("Super Admin user created: username='admin', password='admin123'")
        else:
            print("Super Admin user already exists.")

        # Seed more users for testing roles
        users_to_add = [
            {"username": "ceo_john", "password": "password123", "role": "ceo", "full_name": "John CEO"},
            {"username": "hr_sarah", "password": "password123", "role": "hr", "full_name": "Sarah HR"},
            {"username": "acct_mike", "password": "password123", "role": "accountant", "full_name": "Mike Accountant"},
            {"username": "driver_bob", "password": "password123", "role": "driver", "full_name": "Bob Driver"},
            {"username": "driver_alice", "password": "password123", "role": "driver", "full_name": "Alice Driver"},
            {"username": "staff_tom", "password": "password123", "role": "staff", "full_name": "Tom Staff"}
        ]
        
        roles_map = {r.name: r.id for r in Role.query.all()}
        for u_data in users_to_add:
            if not User.query.filter_by(username=u_data['username']).first():
                rid = roles_map.get(u_data['role'])
                if rid:
                    user = User(username=u_data['username'], role_id=rid, office_id=head_office.id, full_name=u_data['full_name'])
                    user.set_password(u_data['password'])
                    db.session.add(user)
        db.session.commit()
        print("Additional users seeded.")

        # Seed Financial Data
        from models import (
            Purchase, Receipt, Payment, 
            PurchaseCategory, ReceiptCategory, PaymentCategory,
            Driver, Tracking, LiveTracking
        )
        import datetime

        # Seed Categories first
        if not PurchaseCategory.query.first():
            print("Seeding Purchase Categories...")
            fuel_cat = PurchaseCategory(name="Fuel")
            maint_cat = PurchaseCategory(name="Maintenance")
            office_cat = PurchaseCategory(name="Office")
            db.session.add_all([fuel_cat, maint_cat, office_cat])
            db.session.commit()
            
            print("Seeding Purchases (Large Batch)...")
            for i in range(1, 31):
                cat = fuel_cat if i % 2 == 0 else maint_cat
                db.session.add(Purchase(
                    amount=100.0 + (i * 10), 
                    description=f"Purchase {i} - Automated Seed", 
                    category_id=cat.id,
                    created_at=datetime.datetime.utcnow() - datetime.timedelta(days=i)
                ))
            db.session.commit()

        if not ReceiptCategory.query.first():
            print("Seeding Receipt Categories...")
            service_cat = ReceiptCategory(name="Service Fees")
            other_cat = ReceiptCategory(name="Other")
            db.session.add_all([service_cat, other_cat])
            db.session.commit()
            
            print("Seeding Receipts (Large Batch)...")
            for i in range(1, 31):
                db.session.add(Receipt(
                    amount=50.0 + (i * 5), 
                    description=f"Receipt {i} - Service Fee", 
                    category_id=service_cat.id,
                    created_at=datetime.datetime.utcnow() - datetime.timedelta(days=i)
                ))
            db.session.commit()

        if not PaymentCategory.query.first():
            print("Seeding Payment Categories...")
            salary_cat = PaymentCategory(name="Salary")
            utility_cat = PaymentCategory(name="Utility")
            db.session.add_all([salary_cat, utility_cat])
            db.session.commit()
            
            print("Seeding Payments (Large Batch)...")
            for i in range(1, 31):
                db.session.add(Payment(
                    amount=1000.0 + (i * 20), 
                    description=f"Payment {i} - Utility/Salary", 
                    category_id=utility_cat.id,
                    created_at=datetime.datetime.utcnow() - datetime.timedelta(days=i)
                ))
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

        # Seed Sample Invoices (Multi-Table)
        from models import InvoiceHeader, InvoiceCustomerDetail, InvoiceItem, InvoiceAmountDetail
        if not InvoiceHeader.query.first():
            print("Seeding Sample Invoices...")
            admin_user = User.query.filter_by(username='admin').first()
            
            # Invoice 1
            inv1 = InvoiceHeader(
                invoice_number="INV-2026-001",
                date=datetime.date.today(),
                status="Paid",
                tracking_number="TRK-TEST-001",
                mode_of_delivery="Air Freight",
                mode_of_payment="Bank Transfer",
                creator_id=admin_user.id
            )
            db.session.add(inv1)
            db.session.flush()
            
            db.session.add(InvoiceCustomerDetail(
                invoice_id=inv1.id,
                sender_name="Global Tech Solutions",
                sender_email="shipping@globaltech.com",
                sender_phone="+1-555-0199",
                sender_address="123 Tech Park, Silicon Valley",
                sender_city="San Jose",
                sender_zip="95134",
                consignee_name="Rayan Corp",
                consignee_mobile="+971-50-1234567",
                consignee_address="Business Bay, Dubai, UAE"
            ))
            
            db.session.add(InvoiceItem(invoice_id=inv1.id, description="Laptop Dell XPS 15", quantity=5, unit_weight=2.0))
            db.session.add(InvoiceItem(invoice_id=inv1.id, description="Monitors 4K 27 inch", quantity=10, unit_weight=5.5))
            
            db.session.add(InvoiceAmountDetail(
                invoice_id=inv1.id,
                total_cartons=3,
                total_weight=65.0,
                price_per_kg=12.5,
                customs_charge=150.0,
                bill_charge=25.0,
                packing_charge=45.0,
                discount=50.0,
                subtotal=812.5, # 65 * 12.5
                grand_total=982.5 # 812.5 + 150 + 25 + 45 - 50
            ))
            
            db.session.commit()
            print("Sample multi-table invoices seeded.")

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        init_db()
