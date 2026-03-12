from flask import Blueprint, request, jsonify
import datetime
from extensions import db
from models.user import Office
from models.balance_share import BalanceShareRequest, BalanceShareType
from models.finance import Payment, Receipt, PaymentCategory, ReceiptCategory
from utils.auth import role_required
from utils.reports_util import update_daily_report
from services.push_notification_service import send_push_notification
from models.push_subscription import PushSubscription
from models.user import User

balance_share_bp = Blueprint('balance_share', __name__)

def get_or_create_category(model, name):
    cat = model.query.filter_by(name=name).first()
    if not cat:
        cat = model(name=name)
        db.session.add(cat)
        db.session.commit()
    return cat

@balance_share_bp.route('/request', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver', 'super_admin'])
def create_request(current_user):
    data = request.get_json()
    amount = float(data.get('amount', 0))
    receiver_office_id = data.get('receiver_office_id')

    if not current_user.office_id:
        return jsonify({'message': 'User does not belong to an office'}), 400
    if not receiver_office_id or not amount or amount <= 0:
        return jsonify({'message': 'Invalid receiver or amount'}), 400

    sender_office_id = current_user.office_id
    if sender_office_id == receiver_office_id:
        return jsonify({'message': 'Cannot send to own office'}), 400

    status_id = BalanceShareType.query.filter_by(name='waiting').first().id

    new_request = BalanceShareRequest(
        sender_office_id=sender_office_id,
        receiver_office_id=receiver_office_id,
        amount=amount,
        status=status_id,
        date=datetime.date.today(),
        created_at=datetime.datetime.utcnow()
    )
    db.session.add(new_request)
    db.session.commit()

    # Trigger Push Notification to users in receiver office
    receiver_users = User.query.filter_by(office_id=receiver_office_id).all()
    for user in receiver_users:
        subscriptions = PushSubscription.query.filter_by(user_id=user.id).all()
        for sub in subscriptions:
            notification_data = {
                "notification": {
                    "title": "New Balance Share Request",
                    "body": f"Office {current_user.office.name} has requested {amount} to be shared.",
                    "icon": "/assets/icons/icon-72x72.png",
                    "data": {
                        "url": "/balance-share"
                    }
                }
            }
            print(f"Sending Request notification to User {user.id} at {sub.endpoint}")
            success, status_code = send_push_notification(sub.to_dict(), notification_data)
            if not success and status_code in [404, 410]:
                print(f"Deleting invalid subscription: {sub.id} (status: {status_code})")
                db.session.delete(sub)
    
    db.session.commit()

    return jsonify({'message': 'Balance share request sent successfully'}), 201


@balance_share_bp.route('/balance-share-requests', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver', 'super_admin'])
def get_balance_share_requests(current_user):
    office_id = current_user.office_id
    if not office_id:
        return jsonify({'outgoing': []})


    #pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    # Outgoing requests (this office is the sender)
    outgoing = BalanceShareRequest.query.filter_by(sender_office_id=office_id).order_by(BalanceShareRequest.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)


    return jsonify({
        'outgoing': [format_req(req) for req in outgoing],
        'total': outgoing.total,
        'page': outgoing.page,
        'per_page': outgoing.per_page,
        'pages': outgoing.pages
    })


@balance_share_bp.route('/balance-share-received', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver', 'super_admin'])
def get_balance_share_received(current_user):
    office_id = current_user.office_id
    if not office_id:
        return jsonify({'incoming': []})


    # Incoming requests (this office is the receiver)
    #pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    incoming = BalanceShareRequest.query.filter_by(receiver_office_id=office_id).order_by(BalanceShareRequest.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)



    return jsonify({
        'incoming': [format_req(req) for req in incoming],
        'total': incoming.total,
        'page': incoming.page,
        'per_page': incoming.per_page,
        'pages': incoming.pages
    })

def format_req(req):
    return {
        'id': req.id,
        'sender_office_id': req.sender_office_id,
        'sender_office_name': req.sender_office.name if req.sender_office else 'Unknown',
        'receiver_office_id': req.receiver_office_id,
        'receiver_office_name': req.receiver_office.name if req.receiver_office else 'Unknown',
        'amount': req.amount,
        'status': get_balance_share_status(req.status),
        'comment': req.comment,
        'date': req.date.strftime('%Y-%m-%d'),
        'created_at': req.created_at.isoformat(),
        'accepted_at': req.accepted_at.isoformat() if req.accepted_at else None
    }

@balance_share_bp.route('/requests', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver', 'super_admin'])
def get_requests(current_user):
    office_id = current_user.office_id
    if not office_id:
        return jsonify({'incoming': [], 'outgoing': []})

    # Incoming requests (this office is the receiver)
    #pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    incoming = BalanceShareRequest.query.filter_by(receiver_office_id=office_id).order_by(BalanceShareRequest.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    # Outgoing requests (this office is the sender)
    outgoing = BalanceShareRequest.query.filter_by(sender_office_id=office_id).order_by(BalanceShareRequest.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'incoming': [format_req(req) for req in incoming],
        'outgoing': [format_req(req) for req in outgoing]
    })

def get_balance_share_status(status_id):
    return BalanceShareType.query.filter_by(id=status_id).first().name

def get_balance_share_status_id(status_name):
    return BalanceShareType.query.filter_by(name=status_name).first().id

@balance_share_bp.route('/accept/<int:req_id>', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver', 'super_admin'])
def accept_request(current_user, req_id):
    req = BalanceShareRequest.query.get_or_404(req_id)
    
    if req.receiver_office_id != current_user.office_id:
        return jsonify({'message': 'Unauthorized to accept this request'}), 403
        
    if get_balance_share_status(req.status) != 'waiting':
        return jsonify({'message': f'Request already {req.status}'}), 400

    req.status = get_balance_share_status_id('accepted')
    req.accepted_at = datetime.datetime.utcnow()

    # Create Payment for sender
    payment_cat = get_or_create_category(PaymentCategory, 'Balance Share')
    payment = Payment(
        amount=req.amount,
        description=f'Balance Share to {req.receiver_office.name} from {req.sender_office.name}',
        category_id=payment_cat.id,
        office_id=req.sender_office_id,
        creator_id=current_user.id
    )
    db.session.add(payment)

    

    # Create Receipt for receiver
    receipt_cat = get_or_create_category(ReceiptCategory, 'Balance Share')
    receipt = Receipt(
        amount=req.amount,
        description=f'Balance Share from {req.sender_office.name} to {req.receiver_office.name} ',
        category_id=receipt_cat.id,
        office_id=req.receiver_office_id,
        creator_id=current_user.id
    )
    db.session.add(receipt)

    db.session.commit()

    # We must recalculate Daily Reports for both offices from today onwards so that the changes reflect
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    update_daily_report(today_str, req.sender_office_id)
    update_daily_report(today_str, req.receiver_office_id)

    # Notify the SENDER that their request was accepted
    sender_users = User.query.filter_by(office_id=req.sender_office_id).all()
    for user in sender_users:
        subscriptions = PushSubscription.query.filter_by(user_id=user.id).all()
        for sub in subscriptions:
            notification_data = {
                "notification": {
                    "title": "Balance Share Accepted",
                    "body": f"Your balance share request of {req.amount} has been accepted by {req.sender_office.name}",
                    "icon": "/assets/icons/icon-72x72.png",
                    "data": {
                        "url": "/balance-share"
                    }
                }
            }
            print(f"Sending Accept notification to User {user.id} at {sub.endpoint}")
            success, status_code = send_push_notification(sub.to_dict(), notification_data)
            if not success and status_code in [404, 410]:
                print(f"Deleting invalid subscription: {sub.id} (status: {status_code})")
                db.session.delete(sub) 
    
    db.session.commit()

    return jsonify({'message': 'Balance share accepted successfully'})

@balance_share_bp.route('/cancel/<int:req_id>', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver', 'super_admin'])
def cancel_request(current_user, req_id):
    req = BalanceShareRequest.query.get_or_404(req_id)
    
    data = request.get_json() or {}
    comment = data.get('comment')
    if not comment:
        return jsonify({'message': 'A reason for cancellation must be provided'}), 400

    if get_balance_share_status(req.status) != 'waiting':
        return jsonify({'message': f'Cannot cancel request because it is already {req.status}'}), 400

    # Sender or Receiver can cancel
    if current_user.office_id not in [req.sender_office_id, req.receiver_office_id]:
         return jsonify({'message': 'Unauthorized to cancel this request'}), 403

    req.status = get_balance_share_status_id('cancelled')
    req.comment = comment
    db.session.commit()

    # If receiver cancels, notify sender. If sender cancels, notify receiver.
    notified_office_id = req.receiver_office_id if current_user.office_id == req.sender_office_id else req.sender_office_id
    
    receiver_users = User.query.filter_by(office_id=notified_office_id).all()
    for user in receiver_users:
        subscriptions = PushSubscription.query.filter_by(user_id=user.id).all()
        for sub in subscriptions:
            notification_data = {
                "notification": {
                    "title": "Balance Share Cancelled",
                    "body": f"A balance share request of {req.amount} has been cancelled by {current_user.office.name}",
                    "icon": "/assets/icons/icon-72x72.png",
                    "data": {
                        "url": "/balance-share"
                    }
                }
            }
            print(f"Sending Cancel notification to User {user.id} at {sub.endpoint}")
            success, status_code = send_push_notification(sub.to_dict(), notification_data)
            if not success and status_code in [404, 410]:
                print(f"Deleting invalid subscription: {sub.id} (status: {status_code})")
                db.session.delete(sub) 
    
    db.session.commit()

    return jsonify({'message': 'Balance share cancelled'})
