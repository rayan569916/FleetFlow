from flask import Blueprint, request, jsonify
import datetime
from extensions import db
from models.finance import Purchase, Receipt, Payment
from utils.auth import role_required
from utils.reports_util import update_daily_report

finance_bp = Blueprint('finance', __name__)

# --- HELPERS ---
def get_paginated_list(model, serializer):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '')
    category_id = request.args.get('category_id', type=int)
    date_str = request.args.get('date')

    query = model.query

    if search:
        query = query.filter(model.description.ilike(f"%{search}%"))
    
    if category_id:
        query = query.filter(model.category_id == category_id)
    
    if date_str:
        try:
            target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            query = query.filter(db.func.date(model.created_at) == target_date)
        except:
            pass

    pagination = query.order_by(model.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'items': [serializer(item) for item in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages
    })

def delete_item(model, id):
    item = model.query.get(id)
    if not item: return jsonify({'message': 'Item not found'}), 404
    item_date = item.created_at
    db.session.delete(item)
    db.session.commit()
    # Update daily report in real-time
    update_daily_report(item_date)
    return jsonify({'message': 'Item deleted'})

def serialize_purchase(p):
    return {
        'id': p.id, 
        'amount': p.amount, 
        'description': p.description, 
        'category_id': p.category_id, 
        'category_name': p.category.name if p.category else None,
        'created_at': p.created_at.isoformat()
    }
def serialize_receipt(r):
    return {
        'id': r.id, 
        'amount': r.amount, 
        'description': r.description, 
        'category_id': r.category_id, 
        'category_name': r.category.name if r.category else None,
        'created_at': r.created_at.isoformat()
    }
def serialize_payment(p):
    return {
        'id': p.id, 
        'amount': p.amount, 
        'description': p.description, 
        'category_id': p.category_id, 
        'category_name': p.category.name if p.category else None,
        'created_at': p.created_at.isoformat()
    }

# Category Routes
@finance_bp.route('/purchase-categories', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant'])
def get_purchase_categories(current_user):
    from models.finance import PurchaseCategory
    return jsonify([{'id': c.id, 'name': c.name} for c in PurchaseCategory.query.all()])

@finance_bp.route('/receipt-categories', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant'])
def get_receipt_categories(current_user):
    from models.finance import ReceiptCategory
    return jsonify([{'id': c.id, 'name': c.name} for c in ReceiptCategory.query.all()])

@finance_bp.route('/payment-categories', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant'])
def get_payment_categories(current_user):
    from models.finance import PaymentCategory
    return jsonify([{'id': c.id, 'name': c.name} for c in PaymentCategory.query.all()])

# Purchase Routes
@finance_bp.route('/purchases', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant'])
def get_purchases(current_user): return get_paginated_list(Purchase, serialize_purchase)

@finance_bp.route('/purchases', methods=['POST'])
@role_required(['super_admin', 'ceo', 'accountant'])
def create_purchase(current_user):
    data = request.get_json()
    new_purchase = Purchase(
        amount=data['amount'], description=data.get('description'), 
        category_id=data['category_id']
    )
    db.session.add(new_purchase)
    db.session.commit()
    # Update daily report in real-time
    update_daily_report(datetime.date.today())
    return jsonify({'message': 'Purchase created'}), 201

@finance_bp.route('/purchases/<int:id>', methods=['DELETE'])
@role_required(['super_admin', 'ceo', 'accountant'])
def delete_purchase(current_user, id): return delete_item(Purchase, id)

# Receipt Routes
@finance_bp.route('/receipts', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant'])
def get_receipts(current_user): return get_paginated_list(Receipt, serialize_receipt)

@finance_bp.route('/receipts', methods=['POST'])
@role_required(['super_admin', 'ceo', 'accountant'])
def create_receipt(current_user):
    data = request.get_json()
    new_receipt = Receipt(
        amount=data['amount'], description=data.get('description'),
        category_id=data['category_id']
    )
    db.session.add(new_receipt)
    db.session.commit()
    # Update daily report in real-time
    update_daily_report(datetime.date.today())
    return jsonify({'message': 'Receipt created'}), 201

@finance_bp.route('/receipts/<int:id>', methods=['DELETE'])
@role_required(['super_admin', 'ceo', 'accountant'])
def delete_receipt(current_user, id): return delete_item(Receipt, id)

# Payment Routes
@finance_bp.route('/payments', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant'])
def get_payments(current_user): return get_paginated_list(Payment, serialize_payment)

@finance_bp.route('/payments', methods=['POST'])
@role_required(['super_admin', 'ceo', 'accountant'])
def create_payment(current_user):
    data = request.get_json()
    new_payment = Payment(
        amount=data['amount'], description=data.get('description'),
        category_id=data['category_id']
    )
    db.session.add(new_payment)
    db.session.commit()
    # Update daily report in real-time
    update_daily_report(datetime.date.today())
    return jsonify({'message': 'Payment created'}), 201

@finance_bp.route('/payments/<int:id>', methods=['DELETE'])
@role_required(['super_admin', 'ceo', 'accountant'])
def delete_payment(current_user, id): return delete_item(Payment, id)
