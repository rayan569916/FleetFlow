from flask import Blueprint, request, jsonify
import datetime
from extensions import db
from models.shipment import Shipment
from models.fleet import Tracking
from utils.auth import role_required

shipments_bp = Blueprint('shipments', __name__)

@shipments_bp.route('', methods=['GET'])
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

@shipments_bp.route('', methods=['POST'])
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

@shipments_bp.route('/<int:id>', methods=['PUT'])
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

@shipments_bp.route('/<int:id>', methods=['DELETE'])
@role_required(['super_admin', 'ceo'])
def delete_shipment(current_user, id):
    shipment = Shipment.query.get(id)
    if not shipment:
        return jsonify({'message': 'Shipment not found'}), 404
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
            'weight': 'N/A' # Placeholder
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
        'current_location': t.current_location
    })
