from functools import wraps
from flask import request, jsonify, current_app
import jwt
from models.user import User

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
                
                if current_user.role.name not in allowed_roles:
                    return jsonify({'message': 'Permission denied!'}), 403

            except Exception as e:
                return jsonify({'message': 'Token is invalid!'}), 401

            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator
