from flask import Blueprint, request, jsonify, current_app
import jwt
import datetime
from extensions import db
from models.user import User, Role
from utils.auth import role_required

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
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, current_app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({
        'token': token, 
        'role': user.role.name, 
        'username': user.username,
        'full_name': user.full_name
    })

@auth_bp.route('/register', methods=['POST'])
@role_required(['super_admin', 'ceo'])
def register(current_user):
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password') or not data.get('role_id'):
        return jsonify({'message': 'Missing required fields'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 400

    role = Role.query.get(data['role_id'])
    if not role:
         return jsonify({'message': 'Invalid role ID'}), 400

    new_user = User(username=data['username'], role_id=data['role_id'], full_name=data.get('full_name'))
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully!'}), 201

@auth_bp.route('/users', methods=['GET'])
@role_required(['super_admin', 'ceo'])
def get_users(current_user):
    users = User.query.all()
    output = []
    for user in users:
        output.append({
            'id': user.id,
            'username': user.username,
            'role': user.role.name,
            'full_name': user.full_name,
            'created_at': user.created_at
        })
    return jsonify({'users': output})

@auth_bp.route('/roles', methods=['GET'])
def get_roles():
    roles = Role.query.all()
    return jsonify([{'id': r.id, 'name': r.name} for r in roles])
