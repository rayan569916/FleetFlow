from flask import Blueprint, request, jsonify, current_app
import jwt
import datetime
from extensions import db
from models.user import User, Role, Office
from utils.auth import role_required, is_super_user, validate_office_id
from sqlalchemy.orm import joinedload

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Missing username or password'}), 400

    user = User.query.filter_by(username=data['username']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401

    token = jwt.encode({
        'user_id': user.id,
        'role': user.role.name,
        'office':user.office_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, current_app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({
        'token': token, 
        'username': user.username,
        'role': user.role.name,
        'full_name': user.full_name,
        'office_id': user.office_id,
        'office_name': user.office.name if user.office else None,
    })

@auth_bp.route('/register', methods=['POST'])
@role_required(['Super_admin', 'management'])
def register(current_user):
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password') or not data.get('role_id'):
        return jsonify({'message': 'Missing required fields'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 400

    role = Role.query.get(data['role_id'])
    if not role:
         return jsonify({'message': 'Invalid role ID'}), 400

    office_id = data.get('office_id')
    if is_super_user(current_user):
        office_id = office_id or current_user.office_id
    else:
        office_id = current_user.office_id

    if not validate_office_id(office_id):
        return jsonify({'message': 'A valid office_id is required'}), 400

    new_user = User(
        username=data['username'],
        role_id=data['role_id'],
        office_id=office_id,
        full_name=data.get('full_name')
    )
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully!'}), 201

@auth_bp.route('/users', methods=['GET'])
@role_required(['Super_admin', 'management'])
def get_users(current_user):
    # Use joinedload to prevent N+1 queries for role and office
    query = User.query.options(joinedload(User.role), joinedload(User.office))
    if not is_super_user(current_user):
        query = query.filter_by(office_id=current_user.office_id)
    users = query.order_by(User.full_name).all()
    output = [{
        'id': u.id,
        'username': u.username,
        'role': u.role.name,
        'office_id': u.office_id,
        'office_name': u.office.name if u.office else None,
        'full_name': u.full_name,
        'created_at': u.created_at
    } for u in users]
    return jsonify({'users': output})

@auth_bp.route('/roles', methods=['GET'])
def get_roles():
    roles = Role.query.all()
    return jsonify([{'id': r.id, 'name': r.name} for r in roles])

@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@role_required(['Super_admin', 'management'])
def update_user(current_user, user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if 'role_id' in data:
        role = Role.query.get(data['role_id'])
        if not role:
            return jsonify({'message': 'Invalid role ID'}), 400
        user.role_id = data['role_id']

    if 'office_id' in data:
        if not validate_office_id(data['office_id']):
            return jsonify({'message': 'Invalid office ID'}), 400
        user.office_id = data['office_id']

    if 'full_name' in data:
        user.full_name = data['full_name']

    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()
    return jsonify({'message': 'User updated successfully!'})

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@role_required(['Super_admin', 'management'])
def delete_user(current_user, user_id):
    user = User.query.get_or_404(user_id)
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        return jsonify({'message': 'Cannot delete your own account'}), 400

    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted successfully!'})

@auth_bp.route('/offices', methods=['GET'])
@role_required(['Super_admin', 'management'])
def get_offices(current_user):
    offices = Office.query.order_by(Office.name.asc()).all()
    return jsonify([{'id': o.id, 'name': o.name, 'location': o.location} for o in offices])
