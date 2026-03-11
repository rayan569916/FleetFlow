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

    # Pagination
    page = request.args.get('page', default=1, type=int)
    per_page = request.args.get('per_page', default=10, type=int)
    per_page = max(1, min(per_page, 100))

    # Filters (admin/management can filter across offices/roles)
    role_id = request.args.get('role_id', type=int)
    office_id = request.args.get('office_id', type=int)

    if not is_super_user(current_user):
        query = query.filter_by(office_id=current_user.office_id)
        # Non-super users shouldn't be able to filter other offices
        office_id = current_user.office_id

    if role_id:
        query = query.filter(User.role_id == role_id)
    if office_id:
        query = query.filter(User.office_id == office_id)

    paginated = query.order_by(User.full_name).paginate(page=page, per_page=per_page, error_out=False)
    users = paginated.items
    output = [{
        'id': u.id,
        'username': u.username,
        'role': u.role.name,
        'office_id': u.office_id,
        'office_name': u.office.name if u.office else None,
        'full_name': u.full_name,
        'created_at': u.created_at
    } for u in users]
    return jsonify({
        'users': output,
        'page': paginated.page,
        'per_page': paginated.per_page,
        'total': paginated.total,
        'pages': paginated.pages
    })

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
@role_required(['Super_admin', 'super_admin', 'management', 'driver', 'shop_manager'])
def get_offices(current_user):
    offices = Office.query.order_by(Office.name.asc()).all()
    return jsonify([{'id': o.id, 'name': o.name, 'location': o.location, 'office_type': o.office_type} for o in offices])

@auth_bp.route('/offices_for_balance_sharing', methods=['GET'])
@role_required(['Super_admin', 'super_admin', 'management', 'driver', 'shop_manager'])
def get_offices_for_balance_sharing(current_user):
    office_type = (current_user.office.office_type or '').lower() if current_user.office else ''

    if office_type == 'driver':
        office_list = Office.query.filter(Office.office_type == 'shop').order_by(Office.name.asc()).all()
    elif office_type == 'shop':
        office_list = Office.query.filter(Office.office_type == 'management').order_by(Office.name.asc()).all()
    elif office_type == 'management':
        office_list = Office.query.filter(Office.office_type.in_(['central', 'management'])).order_by(Office.name.asc()).all()
    elif office_type == 'central':
        office_list = Office.query.order_by(Office.name.asc()).all()
    else:
        office_list = []

    return jsonify([
        {'id': o.id, 'name': o.name, 'location': o.location, 'office_type': o.office_type}
        for o in office_list
    ])

@auth_bp.route('/offices', methods=['POST'])
@role_required(['Super_admin', 'super_admin', 'management'])
def create_office(current_user):
    data = request.get_json() or {}

    name = (data.get('name') or '').strip()
    location = (data.get('location') or '').strip()

    office_type = data.get('office_type')

    if not name:
        return jsonify({'message': 'Office name is required'}), 400

    existing_office = Office.query.filter(db.func.lower(Office.name) == name.lower()).first()
    if existing_office:
        return jsonify({'message': 'Office name already exists'}), 400

    office = Office(name=name, location=location or None, office_type=office_type or None)
    db.session.add(office)
    db.session.commit()

    return jsonify({
        'message': 'Office created successfully!',
        'office': {'id': office.id, 'name': office.name, 'location': office.location, 'office_type': office.office_type}
    }), 201

@auth_bp.route('/offices/<int:office_id>', methods=['PUT'])
@role_required(['Super_admin', 'super_admin', 'management'])
def update_office(current_user, office_id):
    office = Office.query.get_or_404(office_id)
    data = request.get_json() or {}

    name = (data.get('name') or '').strip()
    location = (data.get('location') or '').strip()

    if not name:
        return jsonify({'message': 'Office name is required'}), 400

    existing_office = Office.query.filter(db.func.lower(Office.name) == name.lower()).first()
    if existing_office and existing_office.id != office.id:
        return jsonify({'message': 'Office name already exists'}), 400

    office.name = name
    office.location = location or None
    if 'office_type' in data:
        office.office_type = data.get('office_type') or None
    db.session.commit()

    return jsonify({
        'message': 'Office updated successfully!',
        'office': {'id': office.id, 'name': office.name, 'location': office.location, 'office_type': office.office_type}
    })
