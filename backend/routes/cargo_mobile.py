from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models.cargo_request import CargoRequest
from models.invoice import InvoiceHeader
from models.featured_offer import FeaturedOffer
from routes.auth_mobile import customer_token_required
import datetime
from urllib.parse import quote_plus
from services.whatsapp_service import send_whatsapp_message

cargo_mobile_bp = Blueprint('cargo_mobile', __name__)


def _build_google_maps_link(address=None, lat=None, lng=None, place_id=None):
    if place_id:
        query = f"{lat},{lng}" if lat is not None and lng is not None else (address or "")
        return (
            "https://www.google.com/maps/search/?api=1"
            f"&query={quote_plus(str(query))}"
            f"&query_place_id={quote_plus(str(place_id))}"
        )
    if lat is not None and lng is not None:
        return f"https://www.google.com/maps?q={lat},{lng}"
    if address:
        return f"https://www.google.com/maps/search/?api=1&query={quote_plus(str(address))}"
    return "N/A"


def _format_request_whatsapp_message(customer, cargo_request):
    pickup_map = _build_google_maps_link(
        address=cargo_request.pickup_address,
        lat=cargo_request.pickup_lat,
        lng=cargo_request.pickup_lng,
        place_id=cargo_request.pickup_place_id,
    )
    dropoff_map = _build_google_maps_link(
        address=cargo_request.dropoff_address,
        lat=cargo_request.dropoff_lat,
        lng=cargo_request.dropoff_lng,
        place_id=cargo_request.dropoff_place_id,
    )

    return (
        "New transportation request created\n"
        f"Request ID: {cargo_request.id}\n"
        f"Created At: {datetime.datetime.now().strftime('%Y-%m-%d %I:%M %p')}\n"
        f"Customer Name: {customer.name or 'N/A'}\n"
        f"Customer Phone: {customer.phone or 'N/A'}\n"
        f"Pickup Address: {cargo_request.pickup_address or 'N/A'}\n"
        f"Pickup Map: {pickup_map}\n"
        f"Dropoff Address: {cargo_request.dropoff_address or 'N/A'}\n"
        # f"Dropoff Map: {dropoff_map}\n"
        f"Cargo Description: {cargo_request.cargo_description or 'N/A'}\n"
        f"Estimated Weight: {cargo_request.estimated_weight or 'N/A'}\n"
        f"Packages: {cargo_request.number_of_packages or 1}"
    )

@cargo_mobile_bp.route('/', methods=['POST'])
@customer_token_required
def create_request(current_customer):
    data = request.get_json()
    if not data or not data.get('pickup_address') or not data.get('dropoff_address') or not data.get('cargo_description'):
        return jsonify({'message': 'Missing required fields: pickup_address, dropoff_address, cargo_description'}), 400

    new_req = CargoRequest(
        customer_id=current_customer.id,
        pickup_address=data['pickup_address'],
        pickup_lat=data.get('pickup_lat'),
        pickup_lng=data.get('pickup_lng'),
        pickup_place_id=data.get('pickup_place_id'),
        dropoff_address=data['dropoff_address'],
        dropoff_lat=data.get('dropoff_lat'),
        dropoff_lng=data.get('dropoff_lng'),
        dropoff_place_id=data.get('dropoff_place_id'),
        cargo_description=data['cargo_description'],
        estimated_weight=data.get('estimated_weight'),
        number_of_packages=data.get('number_of_packages', 1)
    )
    db.session.add(new_req)
    db.session.commit()

    body = _format_request_whatsapp_message(current_customer, new_req)
    send_whatsapp_message("+966549328012", body)
    
    return jsonify({'message': 'Transportation request created successfully', 'id': new_req.id}), 201

@cargo_mobile_bp.route('/', methods=['GET'])
@customer_token_required
def get_my_requests(current_customer):
    requests = CargoRequest.query.filter_by(customer_id=current_customer.id).order_by(CargoRequest.created_at.desc()).all()
    
    result = []
    for req in requests:
        # Check if an invoice is attached
        invoice = InvoiceHeader.query.filter_by(cargo_request_id=req.id).first()
        invoice_data = None
        if invoice:
            invoice_data = {
                'id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'cargo_status': invoice.shipment_status.name if invoice.shipment_status else  None,
                'grand_total': invoice.amount_detail.grand_total if invoice.amount_detail else 0,
                'mode_of_payment': invoice.mode_of_payment or None,
                'status': invoice.status
            }
            
        result.append({
            'id': req.id,
            'pickup_address': req.pickup_address,
            'dropoff_address': req.dropoff_address,
            'cargo_description': req.cargo_description,
            'status': req.status,
            'created_at': req.created_at.isoformat(),
            'invoice': invoice_data
        })
    return jsonify(result), 200

@cargo_mobile_bp.route('/<int:request_id>/payment', methods=['PUT'])
@customer_token_required
def update_payment_method(current_customer, request_id):
    data = request.get_json()
    method = data.get('payment_method')
    
    if method not in ['Direct Cash', 'Direct Bank Transfer', 'Swipe']:
        return jsonify({'message': 'Invalid payment method'}), 400
        
    req = CargoRequest.query.filter_by(id=request_id, customer_id=current_customer.id).first()
    if not req:
        return jsonify({'message': 'Request not found'}), 404
        
    invoice = InvoiceHeader.query.filter_by(cargo_request_id=req.id).first()
    if not invoice:
        return jsonify({'message': 'No invoice generated yet for this request'}), 400
        
    invoice.mode_of_payment = method
    
    if method == 'Direct Bank Transfer':
        invoice.status = 'Awaiting Bank Approval'
    else:
        invoice.status = 'Pending Payment'
        
    db.session.commit()
    
    return jsonify({
        'message': f'Payment method updated to {method}',
        'invoice_status': invoice.status
    }), 200

@cargo_mobile_bp.route('/offers', methods=['GET'])
def get_featured_offers():
    offers = FeaturedOffer.query.filter_by(is_active=True).order_by(FeaturedOffer.created_at.desc()).all()
    result = []
    for o in offers:
        data = o.to_dict()
        # Ensure image_url is an absolute URL usable from any network
        result.append(data)
    return jsonify(result), 200
