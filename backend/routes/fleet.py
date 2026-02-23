from flask import Blueprint, request, jsonify
from extensions import db
from models.fleet import Driver, LiveTracking
from utils.auth import role_required, get_effective_read_office_id, get_effective_write_office_id, validate_office_id

fleet_bp = Blueprint('fleet', __name__)

# --- HELPERS ---
def get_all(model, serializer, current_user):
    requested_office_id = request.args.get('office_id', type=int)
    office_id = get_effective_read_office_id(current_user, requested_office_id)
    if office_id is not None and not validate_office_id(office_id):
        return jsonify({'message': 'Invalid office ID'}), 400
    if office_id is None and current_user.office_id is None and current_user.role.name != 'super_admin':
        return jsonify({'message': 'User is not assigned to an office'}), 403

    query = model.query
    if hasattr(model, 'office_id') and office_id is not None:
        query = query.filter(model.office_id == office_id)

    items = query.order_by(model.created_at.desc()).all()
    return jsonify([serializer(item) for item in items])

def serialize_driver(d):
    return {
        'id': d.id,
        'name': d.name,
        'license_number': d.license_number,
        'status': d.status,
        'contact_number': d.contact_number,
        'assigned_vehicle': d.assigned_vehicle,
        'office_id': d.office_id,
    }
def serialize_live_tracking(lt):
    return {
        'id': lt.id,
        'driver_id': lt.driver_id,
        'latitude': lt.latitude,
        'longitude': lt.longitude,
        'speed': lt.speed,
        'heading': lt.heading,
        'last_updated': lt.last_updated,
        'office_id': lt.office_id,
    }

# Driver Routes
@fleet_bp.route('/drivers', methods=['GET'])
@role_required(['super_admin', 'ceo', 'hr', 'driver', 'staff'])
def get_drivers(current_user): return get_all(Driver, serialize_driver, current_user)

@fleet_bp.route('/drivers', methods=['POST'])
@role_required(['super_admin', 'ceo', 'hr'])
def create_driver(current_user):
    data = request.get_json()
    office_id = get_effective_write_office_id(current_user, data.get('office_id') if data else None)
    if not validate_office_id(office_id):
        return jsonify({'message': 'A valid office_id is required'}), 400

    new_driver = Driver(
        name=data['name'], license_number=data['license_number'], status=data.get('status', 'Active'),
        contact_number=data.get('contact_number'), assigned_vehicle=data.get('assigned_vehicle'),
        office_id=office_id
    )
    db.session.add(new_driver)
    db.session.commit()
    return jsonify({'message': 'Driver created'}), 201

# Live Tracking Routes
@fleet_bp.route('/live-tracking', methods=['GET'])
@role_required(['super_admin', 'ceo', 'driver', 'staff'])
def get_live_tracking(current_user):
    requested_office_id = request.args.get('office_id', type=int)
    office_id = get_effective_read_office_id(current_user, requested_office_id)
    if office_id is not None and not validate_office_id(office_id):
        return jsonify({'message': 'Invalid office ID'}), 400
    if office_id is None and current_user.office_id is None and current_user.role.name != 'super_admin':
        return jsonify({'message': 'User is not assigned to an office'}), 403

    # Return latest location for all active drivers
    query = LiveTracking.query
    if office_id is not None:
        query = query.filter(LiveTracking.office_id == office_id)
    live_data = query.all()
    # Join with Driver info
    output = []
    for lt in live_data:
        driver = Driver.query.get(lt.driver_id)
        data = serialize_live_tracking(lt)
        if driver: data['driver_name'] = driver.name
        output.append(data)
    return jsonify(output)
