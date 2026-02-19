from flask import Blueprint, jsonify, request
from extensions import db
from models.invoice import InvoiceHeader, InvoiceAmountDetail
from models.shipment import Shipment
from models.fleet import Driver
from utils.auth import role_required
import datetime
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant', 'staff'])
def get_stats(current_user):
    period = request.args.get('period', 'today')
    
    # Calculated stats based on real models
    total_invoices = InvoiceHeader.query.count()
    total_revenue = db.session.query(func.sum(InvoiceAmountDetail.grand_total)).scalar() or 0
    active_drivers = Driver.query.filter_by(status='Active').count()
    pending_shipments = Shipment.query.filter(Shipment.status != 'Delivered').count()

    return jsonify({
        'revenue': float(total_revenue),
        'expenses': float(total_revenue * 0.6), # Mock expense calculation
        'profit': float(total_revenue * 0.4),
        'growth': 15.3, # Mock growth
        'active_drivers': active_drivers,
        'pending_shipments': pending_shipments,
        'total_invoices': total_invoices
    })

@dashboard_bp.route('/recent-activity', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant', 'staff'])
def get_recent_activity(current_user):
    # Fetch recent invoices and shipments as activity
    recent_invoices = InvoiceHeader.query.order_by(InvoiceHeader.created_at.desc()).limit(5).all()
    
    activity = []
    for inv in recent_invoices:
        activity.append({
            'id': inv.id,
            'type': 'invoice',
            'title': f'Invoice {inv.invoice_number} generated',
            'timestamp': inv.created_at.isoformat(),
            'user': inv.creator.full_name if inv.creator else 'System',
            'status': inv.status
        })
    
    return jsonify(activity)

@dashboard_bp.route('/trends', methods=['GET'])
@role_required(['super_admin', 'ceo', 'accountant', 'staff'])
def get_trends(current_user):
    # Mock trend data for charts
    trends = [
        {'date': '2026-01', 'value': 45000},
        {'date': '2026-02', 'value': 52000},
        {'date': '2026-03', 'value': 48000},
        {'date': '2026-04', 'value': 61000},
        {'date': '2026-05', 'value': 55000},
        {'date': '2026-06', 'value': 67000}
    ]
    return jsonify(trends)
