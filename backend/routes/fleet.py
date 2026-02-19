from flask import Blueprint, request, jsonify
from extensions import db
from models.fleet import Driver, LiveTracking
from utils.auth import role_required

fleet_bp = Blueprint('fleet', __name__)

# --- HELPERS ---
def get_all(model, serializer):
    items = model.query.order_by(model.created_at.desc()).all()
    return jsonify([serializer(item) for item in items])

def serialize_driver(d):
    return {'id': d.id, 'name': d.name, 'license_number': d.license_number, 'status': d.status, 'contact_number': d.contact_number, 'assigned_vehicle': d.assigned_vehicle}
def serialize_live_tracking(lt):
    return {'id': lt.id, 'driver_id': lt.driver_id, 'latitude': lt.latitude, 'longitude': lt.longitude, 'speed': lt.speed, 'heading': lt.heading, 'last_updated': lt.last_updated}

# Driver Routes
@fleet_bp.route('/drivers', methods=['GET'])
@role_required(['super_admin', 'ceo', 'hr', 'driver', 'staff'])
def get_drivers(current_user): return get_all(Driver, serialize_driver)

@fleet_bp.route('/drivers', methods=['POST'])
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

# Live Tracking Routes
@fleet_bp.route('/live-tracking', methods=['GET'])
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
