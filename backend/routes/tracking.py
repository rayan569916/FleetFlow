from flask import Blueprint, request, jsonify
import datetime
from extensions import db
from models.tracking import ShipmentGroup, ShipmentGroupStatus, ShipmentTrackingEvent, TrackingEventType, ShipmentGroupRoute
from models.invoice import InvoiceHeader, InvoiceCustomerDetail
from models.unit_price import City, Country
from utils.auth import role_required
from sqlalchemy import or_

tracking_bp = Blueprint('tracking', __name__)

def get_or_create_status(name):
    status = ShipmentGroupStatus.query.filter_by(name=name).first()
    if not status:
        status = ShipmentGroupStatus(name=name)
        db.session.add(status)
        db.session.commit()
    return status

def get_or_create_event_type(name):
    event_type = TrackingEventType.query.filter_by(event_type=name).first()
    if not event_type:
        event_type = TrackingEventType(event_type=name)
        db.session.add(event_type)
        db.session.commit()
    return event_type

@tracking_bp.route('/shipments', methods=['GET'])
def get_shipments(current_user=None):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    paginated_data = ShipmentGroup.query.order_by(ShipmentGroup.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    output = []
    for sg in paginated_data.items:
        output.append({
            'id': sg.id,
            'group_code': sg.group_code,
            'origin': sg.origin,
            'destination': sg.destination,
            'loading_date': sg.loading_date.isoformat() if sg.loading_date else None,
            'status': sg.status.name if sg.status else 'Unknown'
        })
        
    return jsonify({
        'items': output,
        'total': paginated_data.total,
        'page': page,
        'pages': paginated_data.pages,
        'per_page': per_page
    })

@tracking_bp.route('/shipments', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def create_shipment_group(current_user):
    data = request.get_json()
    if not data or 'group_code' not in data or 'origin' not in data or 'destination' not in data:
        return jsonify({'message': 'Missing required fields: group_code, origin, destination'}), 400

    # Ensure "Created" status exists
    status = get_or_create_status('Created')

    loading_date_str = data.get('loading_date')
    if loading_date_str:
        loading_date = datetime.datetime.strptime(loading_date_str, '%Y-%m-%d').date()
    else:
        loading_date = datetime.date.today()

    try:
        new_group = ShipmentGroup(
            group_code=data['group_code'],
            origin=data['origin'],
            destination=data['destination'],
            loading_date=loading_date,
            status_id=status.id
        )
        db.session.add(new_group)
        db.session.flush()

        tracking_numbers = data.get('tracking_numbers', [])
        if tracking_numbers:
            # First, fetch City (Fallback to first city if not specified, just for the events)
            # In a real scenario, you'd want a specific location_id
            location = City.query.first()
            event_type = get_or_create_event_type('Added to Shipment')
            
            for t_num in tracking_numbers:
                invoice = InvoiceHeader.query.filter_by(tracking_number=t_num).first()
                if invoice:
                    invoice.cargo_status_id = status.id
                    event = ShipmentTrackingEvent(
                        tracking_id=t_num,
                        shipment_group_id=new_group.id,
                        location_id=location.id if location else 1, # default fallback
                        event_type_id=event_type.id,
                        notes='Initial shipment creation',
                        scanned_by=current_user.id
                    )
                    db.session.add(event)

        db.session.commit()
        return jsonify({'message': 'Shipment group created successfully', 'id': new_group.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to create shipment group', 'error': str(e)}), 500

@tracking_bp.route('/shipments/<int:id>/status', methods=['PUT'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def update_shipment_status(current_user, id):
    data = request.get_json()
    if not data or 'status_name' not in data or 'location_id' not in data:
        return jsonify({'message': 'Missing required fields: status_name, location_id'}), 400

    shipment = ShipmentGroup.query.get(id)
    if not shipment:
        return jsonify({'message': 'Shipment group not found'}), 404

    try:
        status = get_or_create_status(data['status_name'])
        event_type = get_or_create_event_type(data['status_name'])

        # Update shipment status
        shipment.status_id = status.id
        
        # Get all distinct tracking IDs belonging to this shipment
        # We find unique tracking numbers from existing events in this shipment
        tracking_events = ShipmentTrackingEvent.query.filter_by(shipment_group_id=shipment.id).all()
        unique_tracking_ids = set([e.tracking_id for e in tracking_events])

        for t_id in unique_tracking_ids:
            new_event = ShipmentTrackingEvent(
                tracking_id=t_id,
                shipment_group_id=shipment.id,
                location_id=data['location_id'],
                event_type_id=event_type.id,
                notes=data.get('notes', f'Status updated to {status.name}'),
                scanned_by=current_user.id
            )
            db.session.add(new_event)

        db.session.commit()
        return jsonify({'message': 'Shipment status updated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to update shipment status', 'error': str(e)}), 500

@tracking_bp.route('<int:group_code>/export-data', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def export_shipment_data(current_user, group_code):
    try:
        shipment = ShipmentGroup.query.get(group_code)
        if not shipment:
            return jsonify({'message': 'Shipment group not found'}), 404
        events = ShipmentTrackingEvent.query.filter_by(shipment_group_id=shipment.id).all()
        tracking_ids = list(set([e.tracking_id for e in events]))
        
        invoices_data = []
        for t in tracking_ids:
            inv = InvoiceHeader.query.filter_by(tracking_number=t).first()
            if inv:
                invoices_data.append({
                    'tracking_number': t,
                    'loading_date': shipment.loading_date.isoformat() if shipment.loading_date else None,
                    'destination': f"{inv.customer.consignee_city}, {inv.customer.consignee_country}" if inv.customer else "Unknown",
                    'sender_name': inv.customer.sender_name if inv.customer else "Unknown",
                    'sender_phone': inv.customer.sender_phone if inv.customer else "Unknown",
                    'total_cartons': inv.amount_detail.total_cartons if inv.amount_detail else 0,
                    'carton_details': inv.amount_detail.carton_details if inv.amount_detail else "",
                    'total_weight': inv.amount_detail.total_weight if inv.amount_detail else 0.0,
                    'status': inv.shipment_status.name if inv.shipment_status else "Unknown",
                    'destination_address': inv.customer.consignee_address if inv.customer else "Unknown",
                    'destination_city': inv.customer.consignee_city if inv.customer else "Unknown",
                    'destination_country': inv.customer.consignee_country if inv.customer else "Unknown",
                    'postal_code': inv.customer.consignee_postal_code if inv.customer else "Unknown",
                    'consignee_name': inv.customer.consignee_name if inv.customer else "Unknown",
                    'consignee_mobile': inv.customer.consignee_mobile if inv.customer else "Unknown",
                    'loading_date': shipment.loading_date.isoformat() if shipment.loading_date else None,
                    'container_number': inv.container_number if inv else "Unknown",
                    'container_date': inv.container_date.isoformat() if inv.container_date else None,
                    'created_by': inv.creator.full_name or inv.creator.username if inv.creator else "Unknown",
                    'office': inv.office.name if inv.office else "Unknown"
                })

        return jsonify({
            'loading_date': shipment.loading_date.isoformat() if shipment.loading_date else None,
            'destination': shipment.destination,
            'data': invoices_data})

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to export shipment data', 'error': str(e)}), 500
        

@tracking_bp.route('/shipments/<int:id>/details', methods=['GET'])
def get_shipment_details(id, current_user=None):
    shipment = ShipmentGroup.query.get(id)
    if not shipment:
        return jsonify({'message': 'Shipment group not found'}), 404

    events = ShipmentTrackingEvent.query.filter_by(shipment_group_id=id).all()
    # Get the latest event for each tracking ID to know it still belongs to this group
    # Or simply fetch all unique tracking_ids associated with this group
    tracking_ids = list(set([e.tracking_id for e in events]))

    invoices_data = []
    for t_id in tracking_ids:
        inv = InvoiceHeader.query.filter_by(tracking_number=t_id).first()
        if inv:
            cust = inv.customer
            amt = inv.amount_detail
            invoices_data.append({
                'tracking_number': t_id,
                'loading_date': shipment.loading_date.isoformat() if shipment.loading_date else None,
                'destination': f"{cust.consignee_city}, {cust.consignee_country}" if cust else "Unknown",
                'total_cartons': amt.total_cartons if amt else 0,
                'carton_details': amt.carton_details if amt else "",
                'total_weight': amt.total_weight if amt else 0.0,
                'status': inv.shipment_status.name if inv.shipment_status else "Unknown"
            })

    return jsonify({
        'id': shipment.id,
        'group_code': shipment.group_code,
        'origin': shipment.origin,
        'destination': shipment.destination,
        'loading_date': shipment.loading_date.isoformat() if shipment.loading_date else None,
        'status': shipment.status.name if shipment.status else 'Unknown',
        'invoices': invoices_data
    })

@tracking_bp.route('/invoices/search', methods=['GET'])
def invoice_search(current_user=None):
    tracking_id = request.args.get('tracking_id', '').strip()
    if not tracking_id:
        return jsonify({'tracking_number': []})

    try:
        results = (
            db.session.query(ShipmentTrackingEvent.tracking_id)
            .filter(ShipmentTrackingEvent.tracking_id.ilike(f'%{tracking_id}%'))
            .distinct()
            .limit(10)
            .all()
        )

        output = [{'tracking_id': t.tracking_id} for t in results]
        return jsonify({'tracking_number': output})
    except Exception as e:
        return jsonify({'message': 'Search error', 'error': str(e)}), 500


@tracking_bp.route('/invoices/<string:tracking_number>', methods=['GET'])
def track_invoice(tracking_number):
    try:
        invoice = InvoiceHeader.query.filter_by(tracking_number=tracking_number).first()
        if not invoice:
            return jsonify({'message': 'Tracking number not found'}), 404

        # Gather events
        events_query = ShipmentTrackingEvent.query.filter_by(tracking_id =tracking_number).order_by(ShipmentTrackingEvent.scanned_at.asc()).all()
        invoice = InvoiceHeader.query.filter_by(invoice_number=tracking_number).first() if tracking_number else ''
        invoice_sender = InvoiceCustomerDetail.query.filter_by(invoice_id=invoice.id).first() if tracking_number else ''
        
        timeline = []
        for event in events_query:
            city = City.query.get(event.location_id)
            location_name = city.name if city else "Unknown Location"
            
            timeline.append({
                'status': event.event_type.event_type if event.event_type else 'Unknown',
                'location': location_name,
                'timestamp': str(event.scanned_at),
                'description': event.notes,
                'completed': True
            })

        # Calculate current state
        current_status = 'Pending'
        current_location = 'Not picked up'
        if len(events_query) > 0:
            last_event = events_query[-1]
            current_status = last_event.event_type.event_type if last_event.event_type else 'Unknown'
            city = City.query.get(last_event.location_id)
            current_location = city.name if city else "Unknown Location"

        return jsonify({
            'tracking_number': tracking_number,
            'status': current_status,
            'origin': f"{invoice.office.name}" if invoice.office else 'N/A', # Or use invoice sender info
            'destination': f"{invoice.customer.consignee_address}, {invoice.customer.consignee_city}, {invoice.customer.consignee_country}, {invoice.customer.consignee_postal_code}" if invoice.customer else 'N/A',
            'estimated_delivery': 'To be calculated',
            'current_location': current_location,
            'timeline': timeline,
            'mode_of_delivery': invoice.mode_of_delivery,
            'sender_name': invoice_sender.sender_name,
            'consignee_name': invoice_sender.sender_name,
            'consignee_address': invoice_sender.consignee_address,
            'consignee_country': invoice_sender.consignee_country,
            'consignee_city': invoice_sender.consignee_city,
            'consignee_postal_code': invoice_sender.consignee_postal_code
        })


    except Exception as e:
        return jsonify({'message': 'Failed to retrieve tracking info', 'error': str(e)}), 500

@tracking_bp.route('get_destination', methods=['GET'])
def get_destination(current_user=None):
    destination=request.args.get('destination', '').strip()
    if not destination:
        return jsonify({'Destinations': []})

    search = destination

    results = db.session.query(
        City.name.label("city"),
        Country.name.label("country")
    ).join(
        Country, City.country_id == Country.id
    ).filter(
        or_(
            Country.name.ilike(f'%{search}%'),
            City.name.ilike(f'%{search}%')
        )
    ).limit(10).all()
    output = []
    try:
        for city, country in results:
            output.append({
                'dest': f"{city},{country}"
            })
        return jsonify({'Destinations':output})
    except Exception as e:
        return jsonify({'message': 'Search error', 'error': str(e)}), 500

    
@tracking_bp.route('/shipment-status', methods=['GET'])
def get_shipment_status(current_user=None):
    return jsonify({'data': [s.name for s in ShipmentGroupStatus.query.all()]})