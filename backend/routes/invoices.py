from flask import Blueprint, request, jsonify
import datetime
import json
from extensions import db
from models.invoice import InvoiceHeader, InvoiceCustomerDetail, InvoiceItem, InvoiceAmountDetail
from utils.auth import role_required

invoices_bp = Blueprint('invoices', __name__)

@invoices_bp.route('', methods=['GET'])
@role_required(['super_admin', 'ceo', 'hr', 'accountant', 'driver', 'staff'])
def get_invoices(current_user):
    try:
        invoices = InvoiceHeader.query.order_by(InvoiceHeader.created_at.desc()).all()
    except Exception as e:
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
            'full_name': inv.creator.full_name if inv.creator else 'System'
        })
    return jsonify({'invoices': output})

@invoices_bp.route('/<int:id>', methods=['GET'])
@role_required(['super_admin', 'ceo', 'hr', 'accountant', 'driver', 'staff'])
def get_invoice(current_user, id):
    inv = InvoiceHeader.query.get(id)
    if not inv:
        return jsonify({'message': 'Invoice not found'}), 404
    
    # Construct details for frontend compatibility
    details = {
        'customerName': inv.customer.sender_name if inv.customer else '',
        'email': inv.customer.sender_email if inv.customer else '',
        'phone': inv.customer.sender_phone if inv.customer else '',
        'address': inv.customer.sender_address if inv.customer else '',
        'city': inv.customer.sender_city if inv.customer else '',
        'zipCode': inv.customer.sender_zip if inv.customer else '',
        'consigneeName': inv.customer.consignee_name if inv.customer else '',
        'consigneeMobile': inv.customer.consignee_mobile if inv.customer else '',
        'consigneeAddress': inv.customer.consignee_address if inv.customer else '',
        'modeOfDelivery': inv.mode_of_delivery,
        'modeOfPayment': inv.mode_of_payment,
        'trackingNumber': inv.tracking_number,
    }
    
    if inv.amount_detail:
        details.update({
            'totalCartons': inv.amount_detail.total_cartons,
            'totalWeight': inv.amount_detail.total_weight,
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
        'invoice_details': details
    })

@invoices_bp.route('', methods=['POST'])
@role_required(['super_admin', 'ceo', 'accountant'])
def create_invoice(current_user):
    data = request.get_json()
    if not data or 'invoice_number' not in data or 'amount' not in data or 'date' not in data:
        return jsonify({'message': 'Missing required fields'}), 400

    try:
        # 1. Create Header
        header = InvoiceHeader(
            invoice_number=data['invoice_number'],
            date=datetime.datetime.strptime(data['date'], '%Y-%m-%d').date(),
            status=data.get('status', 'Pending'),
            tracking_number=data.get('tracking_number'),
            mode_of_delivery=data.get('modeOfDelivery'),
            mode_of_payment=data.get('modeOfPayment'),
            creator_id=current_user.id
        )
        db.session.add(header)
        db.session.flush() # Get header.id

        # 2. Extract and Create Customer Details
        customer = InvoiceCustomerDetail(
            invoice_id=header.id,
            sender_name=data.get('customerName'),
            sender_email=data.get('email'),
            sender_phone=data.get('phone'),
            sender_address=data.get('address'),
            sender_city=data.get('city'),
            sender_zip=data.get('zipCode'),
            consignee_name=data.get('consigneeName'),
            consignee_mobile=data.get('consigneeMobile'),
            consignee_address=data.get('consigneeAddress')
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
        amount = InvoiceAmountDetail(
            invoice_id=header.id,
            total_cartons=data.get('totalCartons', 1),
            total_weight=data.get('totalWeight', 0.0),
            price_per_kg=data.get('pricePerKg', 0.0),
            customs_charge=data.get('customsCharge', 0.0),
            bill_charge=data.get('billCharge', 0.0),
            packing_charge=data.get('packingCharge', 0.0),
            discount=data.get('discount', 0.0),
            subtotal=data.get('subtotal', 0.0),
            grand_total=data['amount'] # This is the grand total
        )
        db.session.add(amount)

        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error creating invoice: {str(e)}")
        return jsonify({'message': 'Failed to create invoice', 'error': str(e)}), 500

    return jsonify({'message': 'Invoice created!', 'id': header.id}), 201

@invoices_bp.route('/<int:id>/status', methods=['PUT'])
@role_required(['super_admin', 'ceo', 'accountant'])
def update_invoice_status(current_user, id):
    data = request.get_json()
    if not data or 'status' not in data:
        return jsonify({'message': 'Missing status'}), 400

    invoice = InvoiceHeader.query.get(id)
    if not invoice:
        return jsonify({'message': 'Invoice not found'}), 404
    
    invoice.status = data['status']
    db.session.commit()
    return jsonify({'message': 'Invoice status updated!'})

@invoices_bp.route('/<int:id>', methods=['DELETE'])
@role_required(['super_admin', 'ceo']) 
def delete_invoice(current_user, id):
    inv = InvoiceHeader.query.get(id)
    if not inv:
        return jsonify({'message': 'Invoice not found'}), 404
    
    db.session.delete(inv)
    db.session.commit()
    return jsonify({'message': 'Invoice deleted!'})
