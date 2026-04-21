from functools import wraps
from flask import request, jsonify, current_app
import jwt
from models.user import User, Office

SUPER_ROLE = 'super_admin'

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
                return jsonify({'message': 'Token is missing!'}), 401

            try:
                data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
                current_user = User.query.filter_by(id=data['user_id']).first()
                if not current_user:
                     return jsonify({'message': 'User not found!'}), 401
                
                if current_user.role.name not in allowed_roles and current_user.role.name.lower() not in [r.lower() for r in allowed_roles]:
                    return jsonify({'message': 'Permission denied!'}), 403

            except Exception as e:
                return jsonify({'message': 'Token is invalid!'}), 401

            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator

def is_super_user(user):
    if not user or not user.role:
        return False
    return user.role.name.lower() in ['super_admin', 'management']

def get_effective_read_office_id(current_user, requested_office_id=None):
    """
    Returns office scope for read operations:
    - super_admin: requested office if provided, else None (all offices)
    - others: always their assigned office
    """
    if is_super_user(current_user):
        return requested_office_id
    return current_user.office_id

def get_effective_write_office_id(current_user, payload_office_id=None):
    """
    Returns office_id for write operations:
    - super_admin: payload office if provided, otherwise current user's office
    - others: always their assigned office (payload ignored)
    """
    if is_super_user(current_user):
        return payload_office_id or current_user.office_id
    return current_user.office_id

def can_access_office(current_user, office_id):
    if is_super_user(current_user):
        return True
    return current_user.office_id is not None and current_user.office_id == office_id

def validate_office_id(office_id):
    if office_id is None:
        return False
    return Office.query.get(office_id) is not None
