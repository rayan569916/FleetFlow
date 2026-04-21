from services.forget_password_service import gen_reset_token,send_reset_email
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models.customers import Customer
import jwt
from datetime import datetime, timedelta
from functools import wraps

auth_mobile_bp = Blueprint('auth_mobile', __name__)

def customer_token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200

        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(" ", 1)[1].strip()
        
        if not token:
            return jsonify({'message': 'Authorization token is missing or malformed. Use: Bearer <token>'}), 401
        
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            current_customer = Customer.query.get(data['id'])
            if not current_customer:
                return jsonify({'message': 'Customer not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired. Please login again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_customer, *args, **kwargs)
    return decorated

@auth_mobile_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing required fields'}), 400
    
    if Customer.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already exists'}), 400
    
    new_customer = Customer(
        name=data['name'],
        email=data['email'],
        phone=data.get('phone'),
        lat=data.get('lat'),
        lng=data.get('lng'),
        address=data.get('address'),
        place_id=data.get('place_id')
    )
    new_customer.set_password(data['password'])
    
    db.session.add(new_customer)
    db.session.commit()

    token = jwt.encode({
        'id': new_customer.id,
        'email': new_customer.email,
        'role': 'customer',
        'exp': datetime.utcnow() + timedelta(days=30)
    }, current_app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({'message': 'Customer registered successfully!', 'token': token}), 201

@auth_mobile_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing email or password'}), 400
    
    customer = Customer.query.filter_by(email=data['email']).first()
    if not customer or not customer.check_password(data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401
    
    token = jwt.encode({
        'id': customer.id,
        'email': customer.email,
        'role': 'customer',
        'exp': datetime.utcnow() + timedelta(days=30)
    }, current_app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({'message': 'Customer logged in successfully!', 'token': token}), 200

@auth_mobile_bp.route('/profile', methods=['GET'])
@customer_token_required
def get_profile(current_customer):
    return jsonify(current_customer.to_dict()), 200

@auth_mobile_bp.route('/profile', methods=['PUT'])
@customer_token_required
def update_profile(current_customer):
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided'}), 400
    
    if 'name' in data:
        current_customer.name = data['name']
    if 'phone' in data:
        current_customer.phone = data['phone']
    if 'address' in data:
        current_customer.address = data['address']
    
    db.session.commit()
    return jsonify({'message': 'Profile updated successfully!', 'customer': current_customer.to_dict()}), 200

@auth_mobile_bp.route('update-location', methods=['POST'])
@customer_token_required
def update_location(current_customer):
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided'}), 400
    
    if 'lat' in data:
        current_customer.lat = data['lat']
    if 'lng' in data:
        current_customer.lng = data['lng']
    if 'address' in data:
        current_customer.address = data['address']
    if 'place_id' in data:
        current_customer.place_id = data['place_id']
    
    db.session.commit()
    return jsonify({'message': 'Location updated successfully!', 'customer': current_customer.to_dict()}), 200

# @auth_mobile_bp.route('/forgot-password', methods=['POST'])
# def forgot_password():
#     data = request.get_json()
#     if not data or not data.get('email') or not data.get('new_password'):
#         return jsonify({'message': 'Missing email or new password'}), 400
    
#     customer = Customer.query.filter_by(email=data['email']).first()
#     if not customer:
#         return jsonify({'message': 'Customer not found'}), 404
    
#     customer.set_password(data['new_password'])
#     db.session.commit()
    
#     return jsonify({'message': 'Password reset successfully!'}), 200



@auth_mobile_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email=data.get('email')

    user = Customer.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    token = gen_reset_token()
    user.reset_token=token
    user.reset_token_expiry=datetime.utcnow()+timedelta(minutes=15)
    db.session.commit()
    send_reset_email(email, token)
    return jsonify({'message': 'Reset token sent successfully!'}), 200


@auth_mobile_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email')
    token = data.get('token')
    new_password = data.get('new_password')

    user = Customer.query.filter_by(reset_token=token).first()
    if not user:
        return jsonify({'message': 'Invalid token'}), 400
    
    if user.reset_token_expiry < datetime.utcnow():
        return jsonify({'message': 'Token has expired'}), 400

    user.set_password(new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.session.commit()
    return jsonify({'message': 'Password reset successfully!'}), 200
    

