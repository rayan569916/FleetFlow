from flask import Blueprint, request, jsonify
import datetime
from sqlalchemy import func
import json
import uuid
from extensions import db
from models.invoice import InvoiceHeader, InvoiceCustomerDetail, InvoiceItem, InvoiceAmountDetail
from models.cargo_request import CargoRequest
from utils.auth import (
    role_required,
    get_effective_read_office_id,
    get_effective_write_office_id,
    can_access_office,
    validate_office_id,
)
from utils.reports_util import update_daily_report
from models.tracking import ShipmentGroupStatus, ShipmentTrackingEvent, TrackingEventType
from models.unit_price import City

invoices_bp = Blueprint('invoices', __name__)

def generate_next_invoice_number():
    """Generates the next invoice number in CAP-YYYY-XXX format."""
    now = datetime.datetime.now()
    year = now.year
    prefix = f"CAP-{year}-"
    
    # Query for the maximum invoice number for the current year with a row lock
    last_invoice = db.session.query(InvoiceHeader.invoice_number)\
        .filter(InvoiceHeader.invoice_number.like(f"{prefix}%"))\
        .order_by(InvoiceHeader.invoice_number.desc())\
        .with_for_update()\
        .first()
    
    if last_invoice:
        try:
            # Extract the numeric part (e.g., from CAP-2026-001 extract 001)
            last_number_str = last_invoice[0].split('-')[-1]
            next_number = int(last_number_str) + 1
            return f"{prefix}{str(next_number).zfill(3)}"
        except (ValueError, IndexError):
            # Fallback if the format was unexpected
            return f"{prefix}001"
    else:
        return f"{prefix}001"

def _get_or_create_group_status(name):
    status = ShipmentGroupStatus.query.filter_by(name=name).first()
    if not status:
        status = ShipmentGroupStatus(name=name)
        db.session.add(status)
        db.session.flush()
    return status

def _get_or_create_event_type(name):
    event_type = TrackingEventType.query.filter_by(event_type=name).first()
    if not event_type:
        event_type = TrackingEventType(event_type=name)
        db.session.add(event_type)
        db.session.flush()
    return event_type

@invoices_bp.route('/get_inv_num',methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def get_inv_num(current_user):
    try:
        return jsonify({'invoice_number': generate_next_invoice_number()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500

@invoices_bp.route('', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def get_invoices(current_user):
    try:
        requested_office_id = request.args.get('office_id', type=int)
        office_id = get_effective_read_office_id(current_user, requested_office_id)

        if office_id is not None and not validate_office_id(office_id):
            return jsonify({'message': 'Invalid office ID'}), 400
        if office_id is None and current_user.office_id is None and current_user.role.name not in ['Super_admin', 'management']:
            return jsonify({'message': 'User is not assigned to an office'}), 403

        query = InvoiceHeader.query
        
        # New Filters
        date_str = request.args.get('date')
        if date_str:
            target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            query = query.filter(InvoiceHeader.date == target_date)
            
        status_filter = request.args.get('status')

        if status_filter:
            query = query.filter(InvoiceHeader.status.ilike(status_filter))

        payment_filter = request.args.get('mode_of_payment')
        print(payment_filter)
        if payment_filter:
            # Match either the value or the label for robustness
            query = query.filter(InvoiceHeader.mode_of_payment.ilike(payment_filter))
            
        search_query = request.args.get('search')
        if search_query:
            query = query.filter(
                (InvoiceHeader.invoice_number.like(f'%{search_query}%')) |
                (InvoiceHeader.tracking_number.like(f'%{search_query}%'))
            )

        if office_id is not None:
            query = query.filter(InvoiceHeader.office_id == office_id)

        # Driver must only see invoices they created.
        user_role_name = (current_user.role.name if current_user.role else '').lower()
        if user_role_name == 'driver':
            query = query.filter(InvoiceHeader.creator_id == current_user.id)

        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        paginated_data = query.order_by(InvoiceHeader.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        invoices = paginated_data.items
        total = paginated_data.total
        pages = paginated_data.pages


    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500
    
    output = []
    for inv in invoices:
        # Get consignee name from customer details
        consignee = inv.customer.consignee_name if inv.customer else 'N/A'
        # Get grand total from amount details
        amount = inv.amount_detail.grand_total if inv.amount_detail else 0.0
        
        output.append({
            'id': inv.id,
            'invoice_number': inv.invoice_number,
            'tracking_number': inv.tracking_number,
            'amount': amount,
            'date': str(inv.date),
            'status': inv.status,
            'description': f"To: {consignee}, By: {inv.mode_of_delivery}",
            'full_name': inv.creator.full_name if inv.creator else 'System',
            'office_id': inv.office_id,
            'office_name': inv.office.name if inv.office else None,
        })
    return jsonify({
        'items': output,
        'total': total,
        'page': page,
        'pages': pages,
        'per_page': per_page
    })

@invoices_bp.route('/customers/search', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def search_customers(current_user):
    phone = request.args.get('phone', '')
    if not phone:
        return jsonify({'customers': []})
    
    try:
        office_id = get_effective_read_office_id(current_user)
        
        # Query distinct customer details based on sender_phone
        # Joining with InvoiceHeader to respect office filtering
        query = db.session.query(
            InvoiceCustomerDetail.sender_name,
            InvoiceCustomerDetail.sender_email,
            InvoiceCustomerDetail.sender_phone,
            InvoiceCustomerDetail.sender_address,
            InvoiceCustomerDetail.sender_city,
            InvoiceCustomerDetail.sender_zip,
            InvoiceCustomerDetail.sender_country_code,
            InvoiceCustomerDetail.sender_location_link,
            InvoiceCustomerDetail.consignee_name,
            InvoiceCustomerDetail.consignee_country_code,
            InvoiceCustomerDetail.consignee_mobile,
            InvoiceCustomerDetail.consignee_address,
            InvoiceCustomerDetail.consignee_country,
            InvoiceCustomerDetail.consignee_city,
            InvoiceCustomerDetail.consignee_postal_code,
        ).join(InvoiceHeader).filter(InvoiceCustomerDetail.sender_phone.like(f'%{phone}%'))
        
        # if office_id is not None:
        #     query = query.filter(InvoiceHeader.office_id == office_id)
        
        customers = query.distinct().all()
        
        output = []
        seen_phones = set()
        for c in customers:
            if c.sender_phone and c.sender_phone not in seen_phones:
                output.append({
                    'customerName': c.sender_name,
                    'email': c.sender_email,
                    'phone': c.sender_phone,
                    'address': c.sender_address,
                    'city': c.sender_city,
                    'zipCode': c.sender_zip,
                    'senderCountryCode': c.sender_country_code,
                    'senderLocationLink': c.sender_location_link,
                    'consigneeName': c.consignee_name,
                    'consigneeCountryCode': c.consignee_country_code,
                    'consigneeMobile': c.consignee_mobile,
                    'consigneeAddress': c.consignee_address,
                    'consigneeCountry': c.consignee_country,
                    'consigneeCity': c.consignee_city,
                    'consigneePostalCode': c.consignee_postal_code,
                })
                seen_phones.add(c.sender_phone)
                if len(output) >= 10: # Limit result count
                    break
                    
        return jsonify({'customers': output})
    except Exception as e:
        return jsonify({'message': 'Search error', 'error': str(e)}), 500

@invoices_bp.route('/<int:id>', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def get_invoice(current_user, id):
    inv = InvoiceHeader.query.get(id)
    if not inv:
        return jsonify({'message': 'Invoice not found'}), 404
    if not can_access_office(current_user, inv.office_id):
        return jsonify({'message': 'You cannot access records from another office'}), 403
    
    # Construct details for frontend compatibility
    details = {
        'customerName': inv.customer.sender_name if inv.customer else '',
        'email': inv.customer.sender_email if inv.customer else '',
        'senderCountryCode': inv.customer.sender_country_code if inv.customer else '',
        'phone': inv.customer.sender_phone if inv.customer else '',
        'address': inv.customer.sender_address if inv.customer else '',
        'city': inv.customer.sender_city if inv.customer else '',
        'zipCode': inv.customer.sender_zip if inv.customer else '',
        'locationLink': inv.customer.sender_location_link if inv.customer else '',
        'consigneeName': inv.customer.consignee_name if inv.customer else '',
        'consigneeCountryCode': inv.customer.consignee_country_code if inv.customer else '',
        'consigneeMobile': inv.customer.consignee_mobile if inv.customer else '',
        'consigneeAddress': inv.customer.consignee_address if inv.customer else '',
        'consigneeCountry': inv.customer.consignee_country if inv.customer else '',
        'consigneeCity': inv.customer.consignee_city if inv.customer else '',
        'consigneePostalCode': inv.customer.consignee_postal_code if inv.customer else '',
        'modeOfDelivery': inv.mode_of_delivery,
        'modeOfPayment': inv.mode_of_payment,
        'trackingNumber': inv.tracking_number,
    }
    
    if inv.amount_detail:
        carton_details = []
        if inv.amount_detail.carton_details:
            try:
                carton_details = json.loads(inv.amount_detail.carton_details)
            except Exception:
                carton_details = []

        details.update({
            'totalCartons': inv.amount_detail.total_cartons,
            'totalWeight': inv.amount_detail.total_weight,
            'cartons': carton_details,
            'pricePerKg': inv.amount_detail.price_per_kg,
            'customsCharge': inv.amount_detail.customs_charge,
            'billCharge': inv.amount_detail.bill_charge,
            'packingCharge': inv.amount_detail.packing_charge,
            'discount': inv.amount_detail.discount,
            'subtotal': inv.amount_detail.subtotal,
            'grandTotal': inv.amount_detail.grand_total,
        })
    
    details['items'] = [
        {
            'description': item.description,
            'quantity': item.quantity,
            'unitWeight': item.unit_weight
        } for item in inv.items
    ]

    return jsonify({
        'id': inv.id,
        'invoice_number': inv.invoice_number,
        'amount': inv.amount_detail.grand_total if inv.amount_detail else 0.0,
        'date': str(inv.date),
        'status': inv.status,
        'tracking_number': inv.tracking_number,
        'office_id': inv.office_id,
        'office_name': inv.office.name if inv.office else None,
        'invoice_details': details
    })

@invoices_bp.route('/next-number', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def get_next_number(current_user):
    """Preview the next available invoice number."""
    return jsonify({'next_number': generate_next_invoice_number()})

@invoices_bp.route('', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def create_invoice(current_user):
    data = request.get_json()
    if not data or 'amount' not in data or 'date' not in data:
        return jsonify({'message': 'Missing required fields'}), 400

    try:
        office_id = get_effective_write_office_id(current_user, data.get('office_id'))
        if not validate_office_id(office_id):
            return jsonify({'message': 'A valid office_id is required'}), 400

        # 1. Generate Invoice Number in Backend (Concurrent Safe)
        invoice_num = generate_next_invoice_number()
        tracking_num = invoice_num
            
        # Determine status based on role
        user_role = (current_user.role.name if current_user.role else '').lower()
        if user_role == 'driver':
            status_name = 'Shipment Picked Up'
        else:
            status_name = 'Arrived at Origin Facility'
            
        status_obj = _get_or_create_group_status(status_name)

        # Validate cargo_request_id if supplied
        cargo_request_id = data.get('cargo_request_id')
        if cargo_request_id:
            cargo_req_check = CargoRequest.query.get(cargo_request_id)
            if not cargo_req_check:
                cargo_request_id = None  # ignore invalid id silently

        header = InvoiceHeader(
            invoice_number=invoice_num,
            date=datetime.datetime.strptime(data['date'], '%Y-%m-%d').date(),
            status=data.get('status', 'Pending'),
            tracking_number=tracking_num,
            mode_of_delivery=data.get('modeOfDelivery'),
            mode_of_payment=data.get('modeOfPayment'),
            creator_id=current_user.id,
            office_id=office_id,
            cargo_status_id=status_obj.id,
            cargo_request_id=cargo_request_id  # ← Link to cargo request
        )
        db.session.add(header)
        db.session.flush() # Get header.id

        # 2. Extract and Create Customer Details
        customer = InvoiceCustomerDetail(
            invoice_id=header.id,
            sender_name=data.get('customerName'),
            sender_email=data.get('email'),
            sender_country_code=data.get('senderCountryCode'),
            sender_phone=data.get('phone'),
            sender_address=data.get('address'),
            sender_city=data.get('city'),
            sender_zip=data.get('zipCode'),
            sender_location_link=data.get('locationLink'),
            consignee_name=data.get('consigneeName'),
            consignee_country_code=data.get('consigneeCountryCode'),
            consignee_mobile=data.get('consigneeMobile'),
            consignee_address=data.get('consigneeAddress'),
            consignee_country=data.get('consigneeCountry'),
            consignee_city=data.get('consigneeCity'),
            consignee_postal_code=data.get('consigneePostalCode')
        )
        db.session.add(customer)

        # 3. Create Items
        items_data = data.get('items', [])
        for item in items_data:
            new_item = InvoiceItem(
                invoice_id=header.id,
                description=item.get('description'),
                quantity=item.get('quantity', 1),
                unit_weight=item.get('unitWeight')
            )
            db.session.add(new_item)

        # 4. Create Amount Details
        cartons = data.get('cartons', []) or []
        total_weight = data.get('totalWeight', 0.0)
        total_customs = 0.0
        total_packing = 0.0
        if cartons:
            total_weight = sum(float(c.get('weight', 0) or 0) for c in cartons)
            total_customs = sum(float(c.get('customsCharge', 0) or 0) for c in cartons)
            total_packing = sum(float(c.get('packingCharge', 0) or 0) for c in cartons)

        amount = InvoiceAmountDetail(
            invoice_id=header.id,
            total_cartons=data.get('totalCartons', 1),
            total_weight=total_weight,
            carton_details=json.dumps(cartons) if cartons else None,
            price_per_kg=data.get('pricePerKg', 0.0),
            customs_charge=total_customs if cartons else data.get('customsCharge', 0.0),
            bill_charge=data.get('billCharge', 0.0),
            packing_charge=total_packing if cartons else data.get('packingCharge', 0.0),
            discount=data.get('discount', 0.0),
            subtotal=data.get('subtotal', 0.0),
            grand_total=data['amount'] # This is the grand total
        )
        db.session.add(amount)
        db.session.flush()

        # 4.5. Update Cargo Request Status if linked
        cargo_req_id = data.get('cargo_request_id')
        if cargo_req_id:
            cargo_req = CargoRequest.query.get(cargo_req_id)
            if cargo_req:
                cargo_req.status = 'Invoice_Created'
                # The invoice status is already correctly set during initialization at line 327.
                # We respect the status passed from the frontend (e.g. 'Awaiting Bank Approval')

        db.session.commit()

        # 5. Create Initial Tracking Events
        try:
            # Determine location_id for the tracking event from the user's office
            location_id = current_user.office.location_id if current_user.office else None
            
            # Fallback to satisfy non-nullable location_id constraint if office has no city assigned
            if not location_id:
                fallback_city = City.query.first()
                location_id = fallback_city.id if fallback_city else 1

            if user_role == 'driver':
                # Just one event
                event_type_picked = _get_or_create_event_type('Shipment Picked Up')
                db.session.add(ShipmentTrackingEvent(
                    tracking_id=header.tracking_number,
                    location_id=location_id,
                    event_type_id=event_type_picked.id,
                    notes='Shipment Picked Up by Driver',
                    scanned_by=current_user.id
                ))
            else:
                # Manager: create TWO events
                event_type_picked = _get_or_create_event_type('Shipment Picked Up')
                event_type_arrived = _get_or_create_event_type('Arrived at Origin Facility')
                
                db.session.add(ShipmentTrackingEvent(
                    tracking_id=header.tracking_number,
                    location_id=location_id,
                    event_type_id=event_type_picked.id,
                    notes='Shipment Picked Up (Auto-logged)',
                    scanned_by=current_user.id
                ))
                db.session.add(ShipmentTrackingEvent(
                    tracking_id=header.tracking_number,
                    location_id=location_id,
                    event_type_id=event_type_arrived.id,
                    notes='Arrived at Origin Facility (Logged by Shop Manager)',
                    scanned_by=current_user.id
                ))
            db.session.commit()
        except Exception as te:
            print(f"Tracking event creation failed: {str(te)}")
            # Don't fail the whole invoice creation if tracking event fails

        # Update daily report in real-time
        update_daily_report(header.date, header.office_id)
    except Exception as e:
        db.session.rollback()
        print(f"Error creating invoice: {str(e)}")
        return jsonify({'message': 'Failed to create invoice', 'error': str(e)}), 500

    return jsonify({'message': 'Invoice created!', 'id': header.id}), 201

@invoices_bp.route('/<int:id>/status', methods=['PUT'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def update_invoice_status(current_user, id):
    data = request.get_json()
    status = data.get('status')
    if not status:
        return jsonify({'message': 'Status is required'}), 400
    
    invoice = InvoiceHeader.query.get(id)
    if not invoice:
        return jsonify({'message': 'Invoice not found'}), 404
    
    if not can_access_office(current_user, invoice.office_id):
        return jsonify({'message': 'You cannot access records from another office'}), 403

    try:
        invoice.status = status
        db.session.commit()
        
        # Update daily report in real-time
        update_daily_report(invoice.date, invoice.office_id)
        
        return jsonify({'message': f'Invoice status updated to {status}'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to update status', 'error': str(e)}), 500

@invoices_bp.route('/<int:id>', methods=['PUT'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def update_invoice(current_user, id):
    data = request.get_json()
    invoice = InvoiceHeader.query.get(id)
    if not invoice:
        return jsonify({'message': 'Invoice not found'}), 404
    if not can_access_office(current_user, invoice.office_id):
        return jsonify({'message': 'You cannot access records from another office'}), 403
    
    # Check if invoice is from today
    today = datetime.date.today()
    if invoice.date != today:
        return jsonify({'message': 'Invoices from previous days cannot be edited to ensure historical data integrity.'}), 403

    try:
        # 1. Update Header
        if 'status' in data: invoice.status = data['status']
        if 'tracking_number' in data: invoice.tracking_number = data.get('tracking_number')
        if 'modeOfDelivery' in data: invoice.mode_of_delivery = data.get('modeOfDelivery')
        if 'modeOfPayment' in data: invoice.mode_of_payment = data.get('modeOfPayment')

        # 2. Update Customer Details
        if invoice.customer:
            c = invoice.customer
            c.sender_name = data.get('customerName', c.sender_name)
            c.sender_email = data.get('email', c.sender_email)
            c.sender_country_code = data.get('senderCountryCode', c.sender_country_code)
            c.sender_phone = data.get('phone', c.sender_phone)
            c.sender_address = data.get('address', c.sender_address)
            c.sender_city = data.get('city', c.sender_city)
            c.sender_zip = data.get('zipCode', c.sender_zip)
            c.sender_location_link = data.get('locationLink', c.sender_location_link)
            c.consignee_name = data.get('consigneeName', c.consignee_name)
            c.consignee_country_code = data.get('consigneeCountryCode', c.consignee_country_code)
            c.consignee_mobile = data.get('consigneeMobile', c.consignee_mobile)
            c.consignee_address = data.get('consigneeAddress', c.consignee_address)
            c.consignee_country = data.get('consigneeCountry', c.consignee_country)
            c.consignee_city = data.get('consigneeCity', c.consignee_city)
            c.consignee_postal_code = data.get('consigneePostalCode', c.consignee_postal_code)

        # 3. Update Items (Delete and Re-add for simplicity/reliability)
        if 'items' in data:
            InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
            for item in data['items']:
                new_item = InvoiceItem(
                    invoice_id=invoice.id,
                    description=item.get('description'),
                    quantity=item.get('quantity', 1),
                    unit_weight=item.get('unitWeight')
                )
                db.session.add(new_item)

        # 4. Update Amount Details
        if invoice.amount_detail:
            cartons = data.get('cartons', []) or []
            total_weight = data.get('totalWeight', invoice.amount_detail.total_weight)
            total_customs = invoice.amount_detail.customs_charge
            total_packing = invoice.amount_detail.packing_charge
            
            if cartons:
                total_weight = sum(float(c.get('weight', 0) or 0) for c in cartons)
                total_customs = sum(float(c.get('customsCharge', 0) or 0) for c in cartons)
                total_packing = sum(float(c.get('packingCharge', 0) or 0) for c in cartons)

            a = invoice.amount_detail
            a.total_cartons = data.get('totalCartons', a.total_cartons)
            a.total_weight = total_weight
            a.carton_details = json.dumps(cartons) if cartons else a.carton_details
            a.price_per_kg = data.get('pricePerKg', a.price_per_kg)
            a.customs_charge = total_customs
            a.bill_charge = data.get('billCharge', a.bill_charge)
            a.packing_charge = total_packing
            a.discount = data.get('discount', a.discount)
            a.subtotal = data.get('subtotal', a.subtotal)
            a.grand_total = data.get('amount', a.grand_total)

        db.session.commit()
        # Update daily report in real-time
        update_daily_report(invoice.date, invoice.office_id)
        return jsonify({'message': 'Invoice updated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to update invoice', 'error': str(e)}), 500

@invoices_bp.route('/<int:id>', methods=['DELETE'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver']) 
def delete_invoice(current_user, id):
    inv = InvoiceHeader.query.get(id)
    if not inv:
        return jsonify({'message': 'Invoice not found'}), 404
    if not can_access_office(current_user, inv.office_id):
        return jsonify({'message': 'You cannot access records from another office'}), 403
    
    invoice_date = inv.date
    office_id = inv.office_id
    db.session.delete(inv)
    db.session.commit()
    # Update daily report in real-time
    update_daily_report(invoice_date, office_id)
    return jsonify({'message': 'Invoice deleted!'})
