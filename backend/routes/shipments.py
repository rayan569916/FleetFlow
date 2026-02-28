from flask import Blueprint, request, jsonify
import datetime
from extensions import db
from models.shipment import Shipment
from models.fleet import Tracking
from utils.auth import (
    role_required,
    get_effective_read_office_id,
    get_effective_write_office_id,
    can_access_office,
    validate_office_id,
)

shipments_bp = Blueprint('shipments', __name__)

@shipments_bp.route('', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def get_shipments(current_user):
    requested_office_id = request.args.get('office_id', type=int)
    office_id = get_effective_read_office_id(current_user, requested_office_id)
    if office_id is not None and not validate_office_id(office_id):
        return jsonify({'message': 'Invalid office ID'}), 400
    if office_id is None and current_user.office_id is None and current_user.role.name not in ['Super_admin', 'management']:
        return jsonify({'message': 'User is not assigned to an office'}), 403

    query = Shipment.query
    if office_id is not None:
        query = query.filter(Shipment.office_id == office_id)
    shipments = query.order_by(Shipment.created_at.desc()).all()
    output = []
    for s in shipments:
        output.append({
            'id': s.id,
            'tracking_number': s.tracking_number,
            'status': s.status,
            'origin': s.origin,
            'destination': s.destination,
            'estimated_delivery': str(s.estimated_delivery) if s.estimated_delivery else None,
            'carrier': s.carrier,
            'office_id': s.office_id,
        })
    return jsonify(output)

@shipments_bp.route('', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def create_shipment(current_user):
    data = request.get_json()
    office_id = get_effective_write_office_id(current_user, data.get('office_id') if data else None)
    if not validate_office_id(office_id):
        return jsonify({'message': 'A valid office_id is required'}), 400

    new_shipment = Shipment(
        tracking_number=data['tracking_number'],
        status=data.get('status', 'Pending'),
        origin=data.get('origin'),
        destination=data.get('destination'),
        estimated_delivery=datetime.datetime.strptime(data['estimated_delivery'], '%Y-%m-%d').date() if data.get('estimated_delivery') else None,
        carrier=data.get('carrier'),
        office_id=office_id
    )
    db.session.add(new_shipment)
    db.session.commit()
    return jsonify({'message': 'Shipment created'}), 201

@shipments_bp.route('/<int:id>', methods=['PUT'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def update_shipment(current_user, id):
    data = request.get_json()
    shipment = Shipment.query.get(id)
    if not shipment:
        return jsonify({'message': 'Shipment not found'}), 404
    if not can_access_office(current_user, shipment.office_id):
        return jsonify({'message': 'You cannot access records from another office'}), 403
    
    shipment.tracking_number = data.get('tracking_number', shipment.tracking_number)
    shipment.status = data.get('status', shipment.status)
    shipment.origin = data.get('origin', shipment.origin)
    shipment.destination = data.get('destination', shipment.destination)
    if data.get('estimated_delivery'):
        shipment.estimated_delivery = datetime.datetime.strptime(data['estimated_delivery'], '%Y-%m-%d').date()
    shipment.carrier = data.get('carrier', shipment.carrier)
    
    db.session.commit()
    return jsonify({'message': 'Shipment updated'})

@shipments_bp.route('/<int:id>', methods=['DELETE'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def delete_shipment(current_user, id):
    shipment = Shipment.query.get(id)
    if not shipment:
        return jsonify({'message': 'Shipment not found'}), 404
    if not can_access_office(current_user, shipment.office_id):
        return jsonify({'message': 'You cannot access records from another office'}), 403
    db.session.delete(shipment)
    db.session.commit()
    return jsonify({'message': 'Shipment deleted'})

@shipments_bp.route('/tracking/<string:tracking_number>', methods=['GET'])
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
            'weight': 'N/A', # Placeholder
            'office_id': s.office_id,
        })

    # Check Tracking table (Legacy)
    t = Tracking.query.filter_by(tracking_number=tracking_number).first()
    if not t: return jsonify({'message': 'Tracking not found'}), 404
    
    return jsonify({
        'id': t.id,
        'tracking_number': t.tracking_number,
        'status': t.status,
        'origin': t.origin,
        'destination': t.destination,
        'estimated_delivery': str(t.estimated_delivery) if t.estimated_delivery else None,
        'current_location': t.current_location,
        'office_id': t.office_id,
    })
