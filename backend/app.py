from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps
import os

app = Flask(__name__)
# Allow CORS for all domains on all routes. Supports credentials.
CORS(app, resources={r"/*": {"origins": "http://localhost:4200"}}, supports_credentials=True)

# Database Configuration
# Replace with your actual MySQL credentials
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://admin:admin@localhost/fleetflow_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_recycle': 280,
    'pool_pre_ping': True,
}
app.config['SECRET_KEY'] = 'your_secret_key_here' # Change this to a secure random key

db = SQLAlchemy(app)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False) # super_admin, ceo, hr, accountant, driver, staff
    full_name = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# Invoice Model
class Invoice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='Pending') # Pending, Paid, Canceled
    description = db.Column(db.String(200))
    # Store full JSON payload for viewing/printing (items, addresses, etc.)
    invoice_details = db.Column(db.Text, nullable=True) 
    tracking_number = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# Shipment Model
class Shipment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tracking_number = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(50), default='Pending')
    origin = db.Column(db.String(100))
    destination = db.Column(db.String(100))
    estimated_delivery = db.Column(db.Date)
    carrier = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# Finance Models
class Purchase(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_name = db.Column(db.String(100), nullable=False)
    vendor = db.Column(db.String(100))
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='Completed')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Receipt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    receipt_number = db.Column(db.String(50), unique=True, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    payment_method = db.Column(db.String(50), nullable=False) # Credit Card, Bank Transfer, Cash
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='Processed')
    reference_id = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# Report Model
class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), nullable=False) # PDF, Excel, CSV
    generated_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    file_path = db.Column(db.String(255)) # Path to file on server (optional if generated on fly)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# Fleet Management Models
class Driver(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # Optional link to User login
    name = db.Column(db.String(100), nullable=False)
    license_number = db.Column(db.String(50), unique=True)
    status = db.Column(db.String(20), default='Active') # Active, On Leave, Inactive
    contact_number = db.Column(db.String(20))
    assigned_vehicle = db.Column(db.String(50)) # Could be FK to Vehicle table later
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Tracking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tracking_number = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(50), default='Pending') # In Transit, Delivered, etc.
    origin = db.Column(db.String(100))
    destination = db.Column(db.String(100))
    estimated_delivery = db.Column(db.Date)
    current_location = db.Column(db.String(100))
    weight = db.Column(db.String(20))
    service_type = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class LiveTracking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('driver.id'), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    speed = db.Column(db.Float) # km/h
    heading = db.Column(db.Float) # degrees

# RBAC Decorator
def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.method == 'OPTIONS':
                return jsonify({'status': 'ok'}), 200

            token = None
            if 'Authorization' in request.headers:
                token = request.headers['Authorization'].split(" ")[1]
            
            if not token:
                print("DEBUG: Token is missing!")
                return jsonify({'message': 'Token is missing!'}), 401

            try:
                print("DEBUG: Decoding token...")
                data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
                print(f"DEBUG: Token decoded. User ID: {data['user_id']}")
                current_user = User.query.filter_by(id=data['user_id']).first()
                print(f"DEBUG: User fetched: {current_user}")
                if not current_user:
                     return jsonify({'message': 'User not found!'}), 401
                
                if current_user.role not in allowed_roles:
                    return jsonify({'message': 'Permission denied!'}), 403

            except Exception as e:
                print(f"DEBUG: Token invalid! Error: {e}")
                return jsonify({'message': 'Token is invalid!'}), 401

            print("DEBUG: Calling decorated function...")
            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator

# Routes
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Missing username or password'}), 400

    user = User.query.filter_by(username=data['username']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401

    token = jwt.encode({
        'user_id': user.id,
        'role': user.role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({
        'token': token, 
        'role': user.role, 
        'username': user.username,
        'full_name': user.full_name
    })

@app.route('/register', methods=['POST'])
@role_required(['super_admin', 'ceo'])
def register(current_user):
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password') or not data.get('role'):
        return jsonify({'message': 'Missing required fields'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 400

    valid_roles = ['super_admin', 'ceo', 'hr', 'accountant', 'driver', 'staff']
    if data['role'] not in valid_roles:
         return jsonify({'message': 'Invalid role'}), 400

    new_user = User(username=data['username'], role=data['role'], full_name=data.get('full_name'))
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully!'}), 201

@app.route('/users', methods=['GET'])
@role_required(['super_admin', 'ceo'])
def get_users(current_user):
    users = User.query.all()
    output = []
    for user in users:
        output.append({
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'full_name': user.full_name,
            'created_at': user.created_at
        })
    return jsonify({'users': output})

# Invoice Routes
@app.route('/invoices', methods=['GET'])
@role_required(['super_admin', 'ceo', 'hr', 'accountant', 'driver', 'staff'])
def get_invoices(current_user):
    print("DEBUG: Entering get_invoices...")
    try:
        invoices = Invoice.query.order_by(Invoice.created_at.desc()).all()
        print(f"DEBUG: Invoices query success. Found {len(invoices)} invoices.")
    except Exception as e:
        print(f"DEBUG: Invoices query FAILED: {e}")
        return jsonify({'message': 'Database error'}), 500
    output = []
    for invoice in invoices:
        output.append({
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'amount': invoice.amount,
            'date': str(invoice.date),
            'status': invoice.status,
            'description': invoice.description
        })
    return jsonify({'invoices': output})

@app.route('/invoices/<int:id>', methods=['GET'])
@role_required(['super_admin', 'ceo', 'hr', 'accountant', 'driver', 'staff'])
def get_invoice(current_user, id):
    invoice = Invoice.query.get(id)
    if not invoice:
        return jsonify({'message': 'Invoice not found'}), 404
    
    import json
    details = {}
    if invoice.invoice_details:
        try:
            details = json.loads(invoice.invoice_details)
        except:
            details = {}

    return jsonify({
        'id': invoice.id,
        'invoice_number': invoice.invoice_number,
        'amount': invoice.amount,
        'date': str(invoice.date),
        'status': invoice.status,
        'description': invoice.description,
        'invoice_details': details
    })

@app.route('/invoices', methods=['POST'])
@role_required(['super_admin', 'ceo', 'accountant'])
def create_invoice(current_user):
    data = request.get_json()
    if not data or 'invoice_number' not in data or 'amount' not in data or 'date' not in data:
        return jsonify({'message': 'Missing required fields'}), 400

    import json
    # Store the entire payload as details
    details_json = json.dumps(data)

    new_invoice = Invoice(
        invoice_number=data['invoice_number'],
        amount=data['amount'],
        date=datetime.datetime.strptime(data['date'], '%Y-%m-%d').date(),
        status=data.get('status', 'Pending'),
        description=data.get('description', ''),
        invoice_details=details_json,
        tracking_number=data.get('tracking_number')
    )
    db.session.add(new_invoice)
    db.session.commit()
    return jsonify({'message': 'Invoice created!'}), 201

@app.route('/invoices/<int:id>/status', methods=['PUT'])
@role_required(['super_admin', 'ceo', 'accountant'])
def update_invoice_status(current_user, id):
    data = request.get_json()
    if not data or 'status' not in data:
        return jsonify({'message': 'Missing status'}), 400

    invoice = Invoice.query.get(id)
    if not invoice:
        return jsonify({'message': 'Invoice not found'}), 404
    
    invoice.status = data['status']
    db.session.commit()
    return jsonify({'message': 'Invoice status updated!'})

@app.route('/invoices/<int:id>', methods=['DELETE'])
@role_required(['super_admin', 'ceo']) 
def delete_invoice(current_user, id):
    invoice = Invoice.query.get(id)
    if not invoice:
        return jsonify({'message': 'Invoice not found'}), 404
    
    db.session.delete(invoice)
    db.session.commit()
    return jsonify({'message': 'Invoice deleted!'})

# --- GENERIC CRUD HELPERS (to avoid repetition) ---
def get_all(model, serializer):
    items = model.query.order_by(model.created_at.desc()).all()
    return jsonify([serializer(item) for item in items])

def delete_item(model, id):
    item = model.query.get(id)
    if not item: return jsonify({'message': 'Item not found'}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Item deleted'})

# --- SERIALIZERS ---
def serialize_purchase(p):
    return {'id': p.id, 'item_name': p.item_name, 'vendor': p.vendor, 'amount': p.amount, 'date': str(p.date), 'status': p.status}
def serialize_receipt(r):
    return {'id': r.id, 'receipt_number': r.receipt_number, 'amount': r.amount, 'date': str(r.date), 'description': r.description}
def serialize_payment(p):
    return {'id': p.id, 'payment_method': p.payment_method, 'amount': p.amount, 'date': str(p.date), 'status': p.status, 'reference_id': p.reference_id}
def serialize_driver(d):
    return {'id': d.id, 'name': d.name, 'license_number': d.license_number, 'status': d.status, 'contact_number': d.contact_number, 'assigned_vehicle': d.assigned_vehicle}
def serialize_tracking(t):
    return {'id': t.id, 'tracking_number': t.tracking_number, 'status': t.status, 'origin': t.origin, 'destination': t.destination, 'estimated_delivery': str(t.estimated_delivery) if t.estimated_delivery else None, 'current_location': t.current_location}
def serialize_live_tracking(lt):
    return {'id': lt.id, 'driver_id': lt.driver_id, 'latitude': lt.latitude, 'longitude': lt.longitude, 'speed': lt.speed, 'heading': lt.heading, 'last_updated': lt.last_updated}

# --- ROUTES ---

# Purchase Routes
@app.route('/purchases', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant'])
def get_purchases(current_user): return get_all(Purchase, serialize_purchase)

@app.route('/purchases', methods=['POST'])
@role_required(['super_admin', 'ceo', 'accountant'])
def create_purchase(current_user):
    data = request.get_json()
    new_purchase = Purchase(
        item_name=data['item_name'], vendor=data.get('vendor'), amount=data['amount'],
        date=datetime.datetime.strptime(data['date'], '%Y-%m-%d').date(), status=data.get('status', 'Completed')
    )
    db.session.add(new_purchase)
    db.session.commit()
    return jsonify({'message': 'Purchase created'}), 201

@app.route('/purchases/<int:id>', methods=['DELETE'])
@role_required(['super_admin', 'ceo', 'accountant'])
def delete_purchase(current_user, id): return delete_item(Purchase, id)

# Receipt Routes
@app.route('/receipts', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant'])
def get_receipts(current_user): return get_all(Receipt, serialize_receipt)

@app.route('/receipts', methods=['POST'])
@role_required(['super_admin', 'ceo', 'accountant'])
def create_receipt(current_user):
    data = request.get_json()
    new_receipt = Receipt(
        receipt_number=data['receipt_number'], amount=data['amount'],
        date=datetime.datetime.strptime(data['date'], '%Y-%m-%d').date(), description=data.get('description')
    )
    db.session.add(new_receipt)
    db.session.commit()
    return jsonify({'message': 'Receipt created'}), 201

@app.route('/receipts/<int:id>', methods=['DELETE'])
@role_required(['super_admin', 'ceo', 'accountant'])
def delete_receipt(current_user, id): return delete_item(Receipt, id)

# Payment Routes
@app.route('/payments', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant'])
def get_payments(current_user): return get_all(Payment, serialize_payment)

@app.route('/payments', methods=['POST'])
@role_required(['super_admin', 'ceo', 'accountant'])
def create_payment(current_user):
    data = request.get_json()
    new_payment = Payment(
        payment_method=data['payment_method'], amount=data['amount'],
        date=datetime.datetime.strptime(data['date'], '%Y-%m-%d').date(), status=data.get('status', 'Processed'), reference_id=data.get('reference_id')
    )
    db.session.add(new_payment)
    db.session.commit()
    return jsonify({'message': 'Payment created'}), 201

@app.route('/payments/<int:id>', methods=['DELETE'])
@role_required(['super_admin', 'ceo', 'accountant'])
def delete_payment(current_user, id): return delete_item(Payment, id)

# Driver Routes
@app.route('/drivers', methods=['GET'])
@role_required(['super_admin', 'ceo', 'hr', 'driver', 'staff'])
def get_drivers(current_user): return get_all(Driver, serialize_driver)

@app.route('/drivers', methods=['POST'])
@role_required(['super_admin', 'ceo', 'hr'])
def create_driver(current_user):
    data = request.get_json()
    new_driver = Driver(
        name=data['name'], license_number=data['license_number'], status=data.get('status', 'Active'),
        contact_number=data.get('contact_number'), assigned_vehicle=data.get('assigned_vehicle')
    )
    db.session.add(new_driver)
    db.session.commit()
    return jsonify({'message': 'Driver created'}), 201

# Tracking Routes
@app.route('/tracking/<string:tracking_number>', methods=['GET'])
def get_tracking(tracking_number):
    # Check Shipment table first (New System)
    s = Shipment.query.filter_by(tracking_number=tracking_number).first()
    if s:
        current_loc = s.origin
        if s.status == 'In Transit':
            current_loc = 'In Transit'
        elif s.status == 'Delivered':
            current_loc = s.destination
            
        return jsonify({
            'id': s.id,
            'tracking_number': s.tracking_number,
            'status': s.status,
            'origin': s.origin,
            'destination': s.destination,
            'estimated_delivery': str(s.estimated_delivery) if s.estimated_delivery else None,
            'current_location': current_loc,
            'serviceType': 'Standard Freight', # Placeholder
            'weight': 'N/A' # Placeholder
        })

    # Check Tracking table (Legacy)
    t = Tracking.query.filter_by(tracking_number=tracking_number).first()
    if not t: return jsonify({'message': 'Tracking not found'}), 404
    
    # Get associated live tracking if driver is assigned (logic to come)
    return jsonify(serialize_tracking(t))

# Live Tracking Routes
@app.route('/live-tracking', methods=['GET'])
@role_required(['super_admin', 'ceo', 'driver', 'staff'])
def get_live_tracking(current_user):
    # Return latest location for all active drivers
    live_data = LiveTracking.query.all()
    # Join with Driver info
    output = []
    for lt in live_data:
        driver = Driver.query.get(lt.driver_id)
        data = serialize_live_tracking(lt)
        if driver: data['driver_name'] = driver.name
        output.append(data)
    return jsonify(output)

# Test Endpoint
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'message': 'Captain Cargo Backend is running!',
        'endpoints': {
            'health': '/health',
            'login': '/login',
            'register': '/register',
            'users': '/users',
            'invoices': '/invoices'
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

# Shipment Routes
@app.route('/shipments', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant', 'driver', 'staff'])
def get_shipments(current_user):
    shipments = Shipment.query.order_by(Shipment.created_at.desc()).all()
    output = []
    for s in shipments:
        output.append({
            'id': s.id,
            'tracking_number': s.tracking_number,
            'status': s.status,
            'origin': s.origin,
            'destination': s.destination,
            'estimated_delivery': str(s.estimated_delivery) if s.estimated_delivery else None,
            'carrier': s.carrier
        })
    return jsonify(output)

@app.route('/shipments', methods=['POST'])
@role_required(['super_admin', 'ceo', 'accountant'])
def create_shipment(current_user):
    data = request.get_json()
    new_shipment = Shipment(
        tracking_number=data['tracking_number'],
        status=data.get('status', 'Pending'),
        origin=data.get('origin'),
        destination=data.get('destination'),
        estimated_delivery=datetime.datetime.strptime(data['estimated_delivery'], '%Y-%m-%d').date() if data.get('estimated_delivery') else None,
        carrier=data.get('carrier')
    )
    db.session.add(new_shipment)
    db.session.commit()
    return jsonify({'message': 'Shipment created'}), 201

@app.route('/shipments/<int:id>', methods=['PUT'])
@role_required(['super_admin', 'ceo', 'accountant'])
def update_shipment(current_user, id):
    data = request.get_json()
    shipment = Shipment.query.get(id)
    if not shipment:
        return jsonify({'message': 'Shipment not found'}), 404
    
    shipment.tracking_number = data.get('tracking_number', shipment.tracking_number)
    shipment.status = data.get('status', shipment.status)
    shipment.origin = data.get('origin', shipment.origin)
    shipment.destination = data.get('destination', shipment.destination)
    if data.get('estimated_delivery'):
        shipment.estimated_delivery = datetime.datetime.strptime(data['estimated_delivery'], '%Y-%m-%d').date()
    shipment.carrier = data.get('carrier', shipment.carrier)
    
    db.session.commit()
    return jsonify({'message': 'Shipment updated'})

@app.route('/shipments/<int:id>', methods=['DELETE'])
@role_required(['super_admin', 'ceo'])
def delete_shipment(current_user, id): return delete_item(Shipment, id)

if __name__ == '__main__':
    # Ensure database tables exist (for dev ease - usually done via migrations or init script)
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
