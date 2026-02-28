from flask import Blueprint, request, jsonify
from extensions import db
from models.invoice import InvoiceHeader, InvoiceAmountDetail
from models.finance import Purchase, Receipt, Payment, DailyReport
from utils.auth import role_required, get_effective_read_office_id, get_effective_write_office_id, validate_office_id
import datetime
from sqlalchemy import func
from sqlalchemy.orm import joinedload

reports_bp = Blueprint('reports', __name__)

def get_report_data_for_date(target_date, office_id):
    """
    Helper to calculate report metrics for a specific date and office.
    Does NOT include previous_total calculation.
    """
    def invoice_query():
        query = db.session.query(func.sum(InvoiceAmountDetail.grand_total)).join(InvoiceHeader).filter(InvoiceHeader.date == target_date)
        if office_id is not None:
            query = query.filter(InvoiceHeader.office_id == office_id)
        return query

    def payment_query(model):
        query = db.session.query(func.sum(model.amount)).filter(func.date(model.created_at) == target_date)
        if office_id is not None:
            query = query.filter(model.office_id == office_id)
        return query

    total_invoice_grand = invoice_query().scalar() or 0.0

    bank_transfer_swipe_sum_query = db.session.query(func.sum(InvoiceAmountDetail.grand_total)).\
        join(InvoiceHeader).\
        filter(InvoiceHeader.date == target_date).\
        filter(InvoiceHeader.mode_of_payment.in_(['bank_transfer', 'swipe']))
    if office_id is not None:
        bank_transfer_swipe_sum_query = bank_transfer_swipe_sum_query.filter(InvoiceHeader.office_id == office_id)
    bank_transfer_swipe_sum = bank_transfer_swipe_sum_query.scalar() or 0.0

    total_payment = payment_query(Payment).scalar() or 0.0
    total_purchase = payment_query(Purchase).scalar() or 0.0
    total_receipt = payment_query(Receipt).scalar() or 0.0

    return {
        'total_invoice_grand': total_invoice_grand,
        'bank_transfer_swipe_sum': bank_transfer_swipe_sum,
        'total_payment': total_payment,
        'total_purchase': total_purchase,
        'total_receipt': total_receipt
    }

@reports_bp.route('/daily', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def get_daily_report(current_user):
    date_str = request.args.get('date')
    requested_office_id = request.args.get('office_id', type=int)
    
    if date_str:
        target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    else:
        target_date = datetime.date.today()
    
    office_id = get_effective_read_office_id(current_user, requested_office_id)

    if office_id is not None and not validate_office_id(office_id):
        return jsonify({'message': 'Invalid office ID'}), 400
    if office_id is None and current_user.office_id is None and current_user.role.name not in ['Super_admin', 'management']:
        return jsonify({'message': 'User is not assigned to an office'}), 403

    # If aggregated view (office_id is None), we sum up per office
    if office_id is None:
        from models.user import Office
        all_offices = Office.query.all()
        aggregated_data = {
            'total_invoice_grand': 0.0,
            'bank_transfer_swipe_sum': 0.0,
            'total_payment': 0.0,
            'total_purchase': 0.0,
            'total_receipt': 0.0,
            'previous_total': 0.0,
            'daily_total': 0.0
        }
        for off in all_offices:
            # For each office, ensure reports exist up to target_date
            off_report = ensure_office_report(target_date, off.id)
            aggregated_data['total_invoice_grand'] += off_report.total_invoice_grand
            aggregated_data['bank_transfer_swipe_sum'] += off_report.bank_transfer_swipe_sum
            aggregated_data['total_payment'] += off_report.total_payment
            aggregated_data['total_purchase'] += off_report.total_purchase
            aggregated_data['total_receipt'] += off_report.total_receipt
            aggregated_data['previous_total'] += off_report.previous_total
            aggregated_data['daily_total'] += off_report.daily_total
        
        aggregated_data['date'] = str(target_date)
        aggregated_data['office_id'] = None
        aggregated_data['is_stored'] = False # Aggregated is virtual
        return jsonify(aggregated_data)

    # Single office view
    report = ensure_office_report(target_date, office_id)
    return jsonify({
        'date': str(report.date),
        'office_id': report.office_id,
        'total_invoice_grand': report.total_invoice_grand,
        'bank_transfer_swipe_sum': report.bank_transfer_swipe_sum,
        'total_payment': report.total_payment,
        'total_purchase': report.total_purchase,
        'total_receipt': report.total_receipt,
        'previous_total': report.previous_total,
        'daily_total': report.daily_total,
        'is_stored': True
    })

def ensure_office_report(target_date, office_id):
    """
    Ensures a report exists for the given office and date.
    If missing, it performs a catch-up from the most recent available report.
    """
    existing = DailyReport.query.filter_by(date=target_date, office_id=office_id).first()
    if existing and target_date != datetime.date.today():
        return existing

    # Find the latest available report before target_date
    latest_report = DailyReport.query.filter(DailyReport.office_id == office_id, DailyReport.date < target_date)\
        .order_by(DailyReport.date.desc()).first()
    
    start_date = (latest_report.date + datetime.timedelta(days=1)) if latest_report else None
    
    # If no reports exist at all, we might need a start date. 
    # Let's find the earliest transaction date or just start from target_date if none.
    if not start_date:
        # Check for earliest invoice/finance entry to establish a baseline if needed, 
        # but for simplicity let's just start from the target_date or a reasonable recent date.
        start_date = target_date

    running_prev_total = latest_report.daily_total if latest_report else 0.0
    
    current_catchup_date = start_date
    while current_catchup_date <= target_date:
        # Calculate for current_catchup_date
        metrics = get_report_data_for_date(current_catchup_date, office_id)
        daily_total = (metrics['total_invoice_grand'] - metrics['bank_transfer_swipe_sum'] - 
                       metrics['total_payment'] - metrics['total_purchase'] + 
                       metrics['total_receipt'] + running_prev_total)
        
        report_record = DailyReport.query.filter_by(date=current_catchup_date, office_id=office_id).first()
        if not report_record:
            report_record = DailyReport(
                date=current_catchup_date,
                office_id=office_id,
                total_invoice_grand=metrics['total_invoice_grand'],
                bank_transfer_swipe_sum=metrics['bank_transfer_swipe_sum'],
                total_payment=metrics['total_payment'],
                total_purchase=metrics['total_purchase'],
                total_receipt=metrics['total_receipt'],
                previous_total=running_prev_total,
                daily_total=daily_total
            )
            db.session.add(report_record)
        else:
            # Update existing if it's today (active day) or if we want to ensure consistency
            report_record.total_invoice_grand = metrics['total_invoice_grand']
            report_record.bank_transfer_swipe_sum = metrics['bank_transfer_swipe_sum']
            report_record.total_payment = metrics['total_payment']
            report_record.total_purchase = metrics['total_purchase']
            report_record.total_receipt = metrics['total_receipt']
            report_record.previous_total = running_prev_total
            report_record.daily_total = daily_total
        
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error saving catch-up report for {current_catchup_date}: {e}")
        
        running_prev_total = daily_total
        if current_catchup_date == target_date:
            return report_record
            
        current_catchup_date += datetime.timedelta(days=1)
    
    return DailyReport.query.filter_by(date=target_date, office_id=office_id).first()

@reports_bp.route('/daily/save', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def save_daily_report(current_user):
    data = request.get_json()
    if not data or 'date' not in data:
        return jsonify({'message': 'Missing date'}), 400
    
    target_date = datetime.datetime.strptime(data['date'], '%Y-%m-%d').date()
    office_id = get_effective_write_office_id(current_user, data.get('office_id'))
    if not validate_office_id(office_id):
        return jsonify({'message': 'A valid office_id is required'}), 400
    
    # Check if already exists
    existing_report = DailyReport.query.filter_by(date=target_date, office_id=office_id).first()
    if existing_report:
        # Update existing
        existing_report.total_invoice_grand = data.get('total_invoice_grand', 0.0)
        existing_report.bank_transfer_swipe_sum = data.get('bank_transfer_swipe_sum', 0.0)
        existing_report.total_payment = data.get('total_payment', 0.0)
        existing_report.total_purchase = data.get('total_purchase', 0.0)
        existing_report.total_receipt = data.get('total_receipt', 0.0)
        existing_report.previous_total = data.get('previous_total', 0.0)
        existing_report.daily_total = data.get('daily_total', 0.0)
    else:
        # Create new
        new_report = DailyReport(
            date=target_date,
            office_id=office_id,
            total_invoice_grand=data.get('total_invoice_grand', 0.0),
            bank_transfer_swipe_sum=data.get('bank_transfer_swipe_sum', 0.0),
            total_payment=data.get('total_payment', 0.0),
            total_purchase=data.get('total_purchase', 0.0),
            total_receipt=data.get('total_receipt', 0.0),
            previous_total=data.get('previous_total', 0.0),
            daily_total=data.get('daily_total', 0.0)
        )
        db.session.add(new_report)
    
    try:
        db.session.commit()
        return jsonify({'message': 'Daily report saved successfully!'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to save report', 'error': str(e)}), 500

@reports_bp.route('/categories', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def get_categories(current_user):
    from models.finance import PurchaseCategory, ReceiptCategory, PaymentCategory
    type = request.args.get('type')
    if type == 'purchase':
        cats = PurchaseCategory.query.all()
    elif type == 'receipt':
        cats = ReceiptCategory.query.all()
    elif type == 'payment':
        cats = PaymentCategory.query.all()
    else:
        return jsonify({'message': 'Invalid category type'}), 400
    
    return jsonify([{'id': c.id, 'name': c.name} for c in cats])

@reports_bp.route('/invoices', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def get_invoice_report(current_user):
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    requested_office_id = request.args.get('office_id', type=int)

    office_id = get_effective_read_office_id(current_user, requested_office_id)
    
    from models.user import User, Office
    query = db.session.query(
        InvoiceHeader.id,
        InvoiceHeader.date,
        InvoiceHeader.invoice_number,
        InvoiceHeader.tracking_number,
        InvoiceHeader.mode_of_payment,
        InvoiceAmountDetail.grand_total,
        InvoiceHeader.office_id,
        Office.name.label('office_name'),
        User.full_name.label('created_by_name')
    ).join(InvoiceAmountDetail).join(Office, InvoiceHeader.office_id == Office.id).outerjoin(User, InvoiceHeader.creator_id == User.id)

    if start_date_str:
        start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
        query = query.filter(InvoiceHeader.date >= start_date)
    if end_date_str:
        end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
        query = query.filter(InvoiceHeader.date <= end_date)
    if office_id is not None:
        query = query.filter(InvoiceHeader.office_id == office_id)

    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    paginated_data = query.order_by(InvoiceHeader.date.desc()).paginate(page=page, per_page=per_page, error_out=False)
    results = paginated_data.items
 
    output = [{
        'id': r.id,
        'date': str(r.date),
        'invoice_number': r.invoice_number,
        'tracking_number': r.tracking_number,
        'mode_of_payment': r.mode_of_payment,
        'grand_total': r.grand_total,
        'office_id': r.office_id,
        'office_name': r.office_name,
        'created_by_name': r.created_by_name or 'System'
    } for r in results]

    return jsonify({
        'items': output,
        'total': paginated_data.total,
        'page': page,
        'pages': paginated_data.pages,
        'per_page': per_page
    })

def get_finance_report(model, current_user):
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    requested_office_id = request.args.get('office_id', type=int)
    category_id = request.args.get('category_id', type=int)

    office_id = get_effective_read_office_id(current_user, requested_office_id)
    
    # Use joinedload to prevent N+1 queries for category, office, creator
    query = model.query.options(
        joinedload(model.category),
        joinedload(model.office),
        joinedload(model.creator)
    )

    if start_date_str:
        start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
        query = query.filter(func.date(model.created_at) >= start_date)
    if end_date_str:
        end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
        query = query.filter(func.date(model.created_at) <= end_date)
    if office_id is not None:
        query = query.filter(model.office_id == office_id)
    if category_id:
        query = query.filter(model.category_id == category_id)

    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 10, type=int), 100)  # Cap per_page at 100
    paginated_data = query.order_by(model.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    output = [{
        'id': r.id,
        'amount': r.amount,
        'description': r.description,
        'category_id': r.category_id,
        'category_name': r.category.name if r.category else 'N/A',
        'office_id': r.office_id,
        'office_name': r.office.name if r.office else 'N/A',
        'created_by_name': r.creator.full_name if r.creator else 'System',
        'created_at': r.created_at.isoformat()
    } for r in paginated_data.items]

    return jsonify({
        'items': output,
        'total': paginated_data.total,
        'page': page,
        'pages': paginated_data.pages,
        'per_page': per_page
    })

@reports_bp.route('/payments', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def get_payment_report(current_user):
    return get_finance_report(Payment, current_user)

@reports_bp.route('/purchases', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def get_purchase_report(current_user):
    return get_finance_report(Purchase, current_user)

@reports_bp.route('/receipts', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def get_receipt_report(current_user):
    return get_finance_report(Receipt, current_user)

@reports_bp.route('/daily-list', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def get_daily_reports_list(current_user):
    from models.user import Office
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    requested_office_id = request.args.get('office_id', type=int)

    office_id = get_effective_read_office_id(current_user, requested_office_id)
    
    # 1. Determine Date Range
    today = datetime.date.today()
    if end_date_str:
        end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
    else:
        end_date = today

    if start_date_str:
        start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
    else:
        # Default to the first of the current month
        start_date = end_date.replace(day=1)

    # 2. Determine Target Offices
    if office_id is not None:
        target_offices = [Office.query.get(office_id)]
    else:
        target_offices = Office.query.all()
    
    complete_list = []
    
    for off in target_offices:
        if not off: continue
        
        # Ensure reports exist up to end_date for this office
        # This will trigger the catch-up logic
        ensure_office_report(end_date, off.id)
        
        # Fetch all reports in the range for this office
        stored_reports = DailyReport.query.filter(
            DailyReport.office_id == off.id,
            DailyReport.date >= start_date,
            DailyReport.date <= end_date
        ).order_by(DailyReport.date.asc()).all()
        
        for r in stored_reports:
            complete_list.append({
                'date': str(r.date),
                'total_invoice_grand': r.total_invoice_grand,
                'bank_transfer_swipe_sum': r.bank_transfer_swipe_sum,
                'total_payment': r.total_payment,
                'total_purchase': r.total_purchase,
                'total_receipt': r.total_receipt,
                'previous_total': r.previous_total,
                'daily_total': r.daily_total,
                'office_id': off.id,
                'office_name': off.name
            })

    # 6. Sort DESC by date, then office name
    complete_list.sort(key=lambda x: (x['date'], x['office_name']), reverse=True)

    # 7. Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    total = len(complete_list)
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    
    paginated_items = complete_list[start_idx:end_idx]
    pages = (total + per_page - 1) // per_page

    return jsonify({
        'items': paginated_items,
        'total': total,
        'page': page,
        'pages': pages,
        'per_page': per_page
    })
