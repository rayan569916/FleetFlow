from flask import Blueprint, request, jsonify
from extensions import db
from models.cargo_request import CargoRequest
from models.invoice import InvoiceHeader
from utils.auth import role_required, is_super_user

cargo_dashboard_bp = Blueprint('cargo_dashboard', __name__)

@cargo_dashboard_bp.route('', methods=['GET'], strict_slashes=False)
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def get_dashboard_requests(current_user):
    # Fetch active requests (Pending/Invoice_Created) plus any with a pending payment
    pending_payment_ids = [
        h.cargo_request_id for h in 
        InvoiceHeader.query.filter_by(status='Pending Payment').all()
        if h.cargo_request_id
    ]
    requests = CargoRequest.query.filter(
        db.or_(
            CargoRequest.status.in_(['Pending', 'Invoice_Created']),
            CargoRequest.id.in_(pending_payment_ids)
        )
    ).order_by(CargoRequest.created_at.desc()).all()

    
    result = []
    for req in requests:
        invoice = InvoiceHeader.query.filter_by(cargo_request_id=req.id).first()
        invoice_status = invoice.status if invoice else None
        
        result.append({
            'id': req.id,
            'customer_name': req.customer.name if req.customer else 'Unknown',
            'customer_email': req.customer.email if req.customer else '',
            'customer_phone': req.customer.phone if req.customer else '',
            'pickup_address': req.pickup_address,
            'pickup_lat': req.pickup_lat,
            'pickup_lng': req.pickup_lng,
            'pickup_place_id': req.pickup_place_id,
            'dropoff_address': req.dropoff_address,
            'dropoff_lat': req.dropoff_lat,
            'dropoff_lng': req.dropoff_lng,
            'dropoff_place_id': req.dropoff_place_id,
            'cargo_description': req.cargo_description,
            'status': req.status,
            'invoice_status': invoice_status,
            'created_at': req.created_at.isoformat()
        })

    return jsonify(result), 200

@cargo_dashboard_bp.route('/<int:request_id>', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def get_request_details(current_user, request_id):
    req = CargoRequest.query.get_or_404(request_id)
    return jsonify({
        'id': req.id,
        'customer_id': req.customer_id,
        'customer_name': req.customer.name if req.customer else 'Unknown',
        'customer_phone': req.customer.phone if req.customer else '',
        'pickup_address': req.pickup_address,
        'pickup_lat': req.pickup_lat,
        'pickup_lng': req.pickup_lng,
        'pickup_place_id': req.pickup_place_id,
        'dropoff_address': req.dropoff_address,
        'dropoff_lat': req.dropoff_lat,
        'dropoff_lng': req.dropoff_lng,
        'dropoff_place_id': req.dropoff_place_id,
        'cargo_description': req.cargo_description,
        'estimated_weight': req.estimated_weight,
        'number_of_packages': req.number_of_packages,
        'status': req.status
    }), 200

@cargo_dashboard_bp.route('/<int:request_id>/assign', methods=['PUT'])
@role_required(['Super_admin', 'super_admin', 'driver', 'shop_manager', 'management'])
def assign_to_me(current_user, request_id):
    req = CargoRequest.query.get_or_404(request_id)
    
    if req.status != 'Pending':
        return jsonify({'message': 'Request is already being handled'}), 400
        
    # req.auth_driver_id = current_user.id
    # req.office_id = current_user.office_id
    # req.status = 'Processing'
    # db.session.commit()
    
    return jsonify({'message': 'Request assigned to you successfully'}), 200

@cargo_dashboard_bp.route('/<int:request_id>/mark_invoiced', methods=['PUT'])
@role_required(['Super_admin', 'super_admin', 'driver', 'shop_manager', 'management'])
def mark_invoiced(current_user, request_id):
    req = CargoRequest.query.get_or_404(request_id)
    req.status = 'Invoice_Created'
    req.auth_driver_id = current_user.id
    req.office_id = current_user.office_id
    db.session.commit()
    return jsonify({'message': 'Request status updated to Invoice Created'}), 200

@cargo_dashboard_bp.route('/<int:request_id>/approve_payment', methods=['PUT'])
@role_required(['Super_admin', 'super_admin', 'driver', 'shop_manager', 'management'])
def approve_payment(current_user, request_id):
    """Mark a pending cash/swipe payment as Paid and close out the cargo request."""
    req = CargoRequest.query.get_or_404(request_id)
    
    invoice = InvoiceHeader.query.filter_by(cargo_request_id=req.id).first()
    if not invoice:
        return jsonify({'message': 'No invoice linked to this request'}), 404

    if invoice.status not in ('Pending Payment',):
        return jsonify({'message': f'Payment cannot be approved from status: {invoice.status}'}), 400

    invoice.status = 'Paid'
    req.status = 'Completed'
    db.session.commit()

    return jsonify({'message': 'Payment approved. Invoice marked as Paid.'}), 200
