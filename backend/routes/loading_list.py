from flask import Blueprint, request, jsonify
import datetime
from extensions import db
from models.invoice import InvoiceHeader
from models.tracking import ShipmentGroup, ShipmentGroupStatus, ShipmentTrackingEvent, TrackingEventType
from models.unit_price import City, Country
from sqlalchemy import desc
from utils.auth import (
    role_required,
    get_effective_read_office_id,
)

loading_list_bp = Blueprint('loading_list', __name__)


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


def _resolve_city_location_id(location_id=None, location_name=None):
    if location_id:
        city = City.query.get(location_id)
        if city:
            return city.id

    if location_name:
        parts = [p.strip() for p in location_name.split(',')]
        city_name = parts[0]
        country_name = parts[1] if len(parts) > 1 else None

        # Try exact match first
        city = City.query.filter(City.name.ilike(city_name)).first()
        if not city:
            # Try partial match
            city = City.query.filter(City.name.ilike(f'%{city_name}%')).first()

        if city:
            return city.id

        # If not found, create new entry
        try:
            country_id = None
            if country_name:
                country = Country.query.filter(Country.name.ilike(country_name)).first()
                if not country:
                    country = Country(name=country_name)
                    db.session.add(country)
                    db.session.flush()
                country_id = country.id
            else:
                # Fallback for country_id
                first_country = Country.query.first()
                if first_country:
                    country_id = first_country.id
                else:
                    # Emergency fallback if database is empty
                    country = Country(name='Default')
                    db.session.add(country)
                    db.session.flush()
                    country_id = country.id

            new_city = City(name=city_name, country_id=country_id)
            db.session.add(new_city)
            db.session.flush()
            return new_city.id
        except Exception as e:
            print(f"Error creating city/country: {e}")
            # Fallback if creation fails
            pass

    fallback_city = City.query.first()
    return fallback_city.id if fallback_city else None


def _shipment_group_tracking_ids(group_id):
    events = ShipmentTrackingEvent.query.filter_by(shipment_group_id=group_id).all()
    return sorted(list(set([e.tracking_id for e in events if e.tracking_id])))
        

@loading_list_bp.route('', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def get_loading_list(current_user):
    try:
        requested_office_id = request.args.get('office_id', type=int)
        office_id = get_effective_read_office_id(current_user, requested_office_id)

        query = InvoiceHeader.query
        
        container_number = request.args.get('container_number')
        filter_status = request.args.get('filter_status')
        destination_country = request.args.get('destination_country')
        loading_date = request.args.get('loading_date')
        container_date = request.args.get('container_date')
        
        if container_number:
            query = query.filter(InvoiceHeader.container_number == container_number)
            
        if filter_status:
            if filter_status == 'unassigned':
                # Unassigned means no cargo_status_id or status is not 'Grouped%'
                query = query.outerjoin(ShipmentGroupStatus, InvoiceHeader.cargo_status_id == ShipmentGroupStatus.id)
                query = query.filter((InvoiceHeader.cargo_status_id.is_(None)) | (~ShipmentGroupStatus.name.ilike('Grouped%')))
            elif filter_status == 'current_shop':
                if office_id is not None:
                    query = query.filter((InvoiceHeader.current_office_id == office_id) | 
                                         ((InvoiceHeader.current_office_id.is_(None)) & (InvoiceHeader.office_id == office_id)))
            elif filter_status == 'moved':
                if office_id is not None:
                    query = query.filter((InvoiceHeader.current_office_id != office_id) & (InvoiceHeader.current_office_id.isnot(None)))
            elif filter_status != 'all':
                query = query.outerjoin(ShipmentGroupStatus, InvoiceHeader.cargo_status_id == ShipmentGroupStatus.id)
                query = query.filter((ShipmentGroupStatus.name == filter_status) | (InvoiceHeader.cargo_status == filter_status))

        if destination_country:
            from models.invoice import InvoiceCustomerDetail
            query = query.join(InvoiceCustomerDetail, InvoiceHeader.id == InvoiceCustomerDetail.invoice_id)
            query = query.filter(InvoiceCustomerDetail.consignee_country.ilike(f"%{destination_country}%"))
            
        if loading_date:
            query = query.filter(InvoiceHeader.loading_date == loading_date)
            
        if container_date:
            query = query.filter(InvoiceHeader.container_date == container_date)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        paginated_data = query.order_by(InvoiceHeader.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        invoices = paginated_data.items
        
        output = []
        for inv in invoices:
            cust = inv.customer
            amt = inv.amount_detail
            description = ", ".join([item.description for item in inv.items]) if inv.items else ""
            
            output.append({
                'id': inv.id,
                'invoice_number': inv.invoice_number,
                'tracking_number': inv.tracking_number,
                'total_cartons': amt.total_cartons if amt else 0,
                'total_weight': amt.total_weight if amt else 0.0,
                'mode_of_delivery': inv.mode_of_delivery,
                'destination_address': f"{cust.consignee_address}" if cust else "",
                'destination_city': f"{cust.consignee_city}" if cust else "",
                'destination_country': f"{cust.consignee_country}" if cust else "",
                'destination_postal_code': f"{cust.consignee_postal_code}" if cust else "",
                'full_destination': cust.consignee_address if cust else "",
                'consignee_contact': f"{cust.consignee_country_code}{cust.consignee_mobile}" if cust else "",
                'consignee_name': f"{cust.consignee_name}" if cust else "",
                'consignee_mobile': f"{cust.consignee_mobile}" if cust else "",
                'description': description,
                'loading_date': str(inv.loading_date) if inv.loading_date else None,
                'container_number': inv.container_number,
                'container_date': str(inv.container_date) if inv.container_date else None,
                'current_office_id': inv.current_office_id or inv.office_id,
                'cargo_status': inv.shipment_status.name if inv.shipment_status else (inv.cargo_status or 'At Shop'),
                'external_tracking_number': inv.external_tracking_number,
                'external_tracking_link': inv.external_tracking_link,
                'mode_of_delivery': inv.mode_of_delivery,
                'office_name': inv.office.name if inv.office else None,
                'created_by': inv.creator.full_name if inv.creator_id else None,
            })

        return jsonify({
            'items': output,
            'total': paginated_data.total,
            'page': page,
            'pages': paginated_data.pages,
            'per_page': per_page
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': 'Database error', 'error': str(e)}), 500


@loading_list_bp.route('/create-group', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def create_shipment_group_from_loading_list(current_user):
    data = request.get_json() or {}
    invoice_ids = data.get('invoice_ids', [])
    group_code = (data.get('group_code') or '').strip()
    origin = (data.get('origin') or '').strip()
    destination = (data.get('destination') or '').strip()
    status_name = (data.get('status_name') or data.get('status') or 'Arrived at Origin Facility').strip()
    loading_date_str = data.get('loading_date')

    if not invoice_ids or not group_code or not origin or not destination:
        return jsonify({'message': 'Missing required fields: invoice_ids, group_code, origin, destination'}), 400

    try:
        loading_date = datetime.datetime.strptime(loading_date_str, '%Y-%m-%d').date() if loading_date_str else datetime.date.today()

        invoices = InvoiceHeader.query.filter(InvoiceHeader.id.in_(invoice_ids)).all()
        if len(invoices) != len(set(invoice_ids)):
            return jsonify({'message': 'One or more invoices were not found'}), 404

        missing_tracking = [inv.invoice_number for inv in invoices if not inv.tracking_number]
        if missing_tracking:
            return jsonify({'message': 'Selected invoices must have tracking numbers', 'missing_tracking_for': missing_tracking}), 400

        location_id = _resolve_city_location_id(location_name=origin)
        if not location_id:
            return jsonify({'message': 'No city records found for tracking location resolution'}), 400

        status = _get_or_create_group_status(status_name)
        event_type = _get_or_create_event_type(status_name)

        new_group = ShipmentGroup(
            group_code=group_code,
            origin=origin,
            destination=destination,
            loading_date=loading_date,
            status_id=status.id
        )
        db.session.add(new_group)
        db.session.flush()

        for inv in invoices:
            inv.cargo_status_id = status.id
            inv.loading_date = loading_date
            event = ShipmentTrackingEvent(
                tracking_id=inv.tracking_number,
                shipment_group_id=new_group.id,
                location_id=location_id,
                event_type_id=event_type.id,
                notes=f'Grouped in loading list ({group_code})',
                scanned_by=current_user.id
            )
            db.session.add(event)

        db.session.commit()
        return jsonify({
            'message': 'Shipment group created successfully',
            'shipment_group_id': new_group.id,
            'invoice_count': len(invoices)
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to create shipment group', 'error': str(e)}), 500


@loading_list_bp.route('/group/<int:id>/move', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def move_shipment_group(current_user, id):
    data = request.get_json() or {}
    status_name = (data.get('status') or 'Departed to Origin Warehouse').strip()
    notes = (data.get('notes') or status_name).strip()
    next_location_id = data.get('next_location_id')
    next_location_name = (data.get('next_location_name') or data.get('next_location') or '').strip()
    loading_date_str = data.get('loading_date')

    shipment_group = ShipmentGroup.query.get(id)
    if not shipment_group:
        return jsonify({'message': 'Shipment group not found'}), 404

    try:
        tracking_ids = _shipment_group_tracking_ids(id)
        if not tracking_ids:
            return jsonify({'message': 'No invoices associated with this shipment group'}), 400

        location_id = _resolve_city_location_id(location_id=next_location_id, location_name=next_location_name)
        if not location_id:
            return jsonify({'message': 'No city records found for tracking location resolution'}), 400

        loading_date = datetime.datetime.strptime(loading_date_str, '%Y-%m-%d').date() if loading_date_str else datetime.date.today()

        status = _get_or_create_group_status(status_name)
        event_type = _get_or_create_event_type(status_name)

        shipment_group.status_id = status.id

        for tracking_id in tracking_ids:
            inv = InvoiceHeader.query.filter_by(tracking_number=tracking_id).first()
            if inv:
                inv.cargo_status_id = status.id
                inv.loading_date = loading_date

            event = ShipmentTrackingEvent(
                tracking_id=tracking_id,
                shipment_group_id=id,
                location_id=location_id,
                event_type_id=event_type.id,
                notes=notes,
                scanned_by=current_user.id
            )
            db.session.add(event)

        db.session.commit()
        return jsonify({'message': 'Shipment group moved successfully', 'invoice_count': len(tracking_ids)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to move shipment group', 'error': str(e)}), 500


@loading_list_bp.route('/group/<int:id>/assign-container', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def assign_container_to_group(current_user, id):
    data = request.get_json() or {}
    container_number = (data.get('container_number') or '').strip()
    container_date_str = data.get('container_date')
    status_name = (data.get('status') or 'Container Loading Completed').strip()

    if not container_number:
        return jsonify({'message': 'Missing container_number'}), 400

    shipment_group = ShipmentGroup.query.get(id)
    if not shipment_group:
        return jsonify({'message': 'Shipment group not found'}), 404

    try:
        container_date = datetime.datetime.strptime(container_date_str, '%Y-%m-%d').date() if container_date_str else datetime.date.today()
        tracking_ids = _shipment_group_tracking_ids(id)
        if not tracking_ids:
            return jsonify({'message': 'No invoices associated with this shipment group'}), 400

        status = _get_or_create_group_status(status_name)
        event_type = _get_or_create_event_type(status_name)

        location_id = _resolve_city_location_id(location_name=shipment_group.destination)
        if not location_id:
            return jsonify({'message': 'No city records found for tracking location resolution'}), 400

        shipment_group.status_id = status.id

        for tracking_id in tracking_ids:
            inv = InvoiceHeader.query.filter_by(tracking_number=tracking_id).first()
            if inv:
                inv.container_number = container_number
                inv.container_date = container_date
                inv.cargo_status_id = status.id

            event = ShipmentTrackingEvent(
                tracking_id=tracking_id,
                shipment_group_id=id,
                location_id=location_id,
                event_type_id=event_type.id,
                notes=f'Container assigned: {container_number}',
                scanned_by=current_user.id
            )
            db.session.add(event)

        db.session.commit()
        return jsonify({'message': 'Container assigned to shipment group successfully', 'invoice_count': len(tracking_ids)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to assign container to shipment group', 'error': str(e)}), 500


@loading_list_bp.route('/manual-event', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def add_manual_event(current_user):
    data = request.get_json() or {}
    shipment_group_id = data.get('shipment_group_id') or None
    invoice_id = data.get('invoice_id')
    tracking_number = (data.get('tracking_number') or '').strip()
    status_name = (data.get('status') or data.get('event_name') or 'Manual Update').strip()
    notes = (data.get('notes') or status_name).strip()
    location_id = data.get('location_id')
    location_name = (data.get('location_name') or data.get('location') or '').strip()
    mode = data.get('mode') or ''

    if not shipment_group_id and not invoice_id and not tracking_number:
        return jsonify({'message': 'Provide shipment_group_id or invoice_id or tracking_number'}), 400

    if not shipment_group_id and tracking_number:
        event = ShipmentTrackingEvent.query.filter_by(tracking_id=tracking_number).order_by(desc(ShipmentTrackingEvent.scanned_at), desc(ShipmentTrackingEvent.id)).first()
        if event:
            shipment_group_id = event.shipment_group_id

    try:
        if invoice_id and not tracking_number:
            invoice = InvoiceHeader.query.get(invoice_id)
            if not invoice:
                return jsonify({'message': 'Invoice not found'}), 404
            tracking_number = invoice.tracking_number or ''
            if not mode:
                mode = invoice.mode_of_delivery

        if not mode and tracking_number:
            invoice = InvoiceHeader.query.filter_by(tracking_number=tracking_number).first()
            if invoice:
                mode = invoice.mode_of_delivery

        if not shipment_group_id and mode != 'air':
            last_event = ShipmentTrackingEvent.query.filter_by(tracking_id=tracking_number).order_by(desc(ShipmentTrackingEvent.scanned_at), desc(ShipmentTrackingEvent.id)).first()
            if not last_event:
                return jsonify({'message': 'No shipment group found for this invoice. Provide shipment_group_id.'}), 400
            shipment_group_id = last_event.shipment_group_id

        shipment_group = None
        if shipment_group_id:
            shipment_group = ShipmentGroup.query.get(shipment_group_id)
            
        if not shipment_group and mode == 'sea':
            return jsonify({'message': 'Shipment group not found'}), 404

        if shipment_group_id and not tracking_number:
            tracking_ids = _shipment_group_tracking_ids(shipment_group_id)
        else:
            tracking_ids = [tracking_number]

        if not tracking_ids:
            return jsonify({'message': 'No tracking ids found to apply this event'}), 400

        resolved_location_name = location_name
        if not resolved_location_name and shipment_group:
            resolved_location_name = shipment_group.destination

        resolved_location_id = _resolve_city_location_id(location_id=location_id, location_name=resolved_location_name)
        if not resolved_location_id:
            return jsonify({'message': 'No city records found for tracking location resolution'}), 400

        status = _get_or_create_group_status(status_name)
        event_type = _get_or_create_event_type(status_name)
        
        if shipment_group:
            shipment_group.status_id = status.id

        for tracking_id in tracking_ids:
            inv = InvoiceHeader.query.filter_by(tracking_number=tracking_id).first()
            if inv:
                inv.cargo_status_id = status.id

            event = ShipmentTrackingEvent(
                tracking_id=tracking_id,
                shipment_group_id=shipment_group_id,
                location_id=resolved_location_id,
                event_type_id=event_type.id,
                notes=notes,
                scanned_by=current_user.id
            )
            db.session.add(event)

        db.session.commit()
        return jsonify({'message': 'Manual tracking event added successfully', 'invoice_count': len(tracking_ids)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to add manual tracking event', 'error': str(e)}), 500

@loading_list_bp.route('/move', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def move_cargo(current_user):
    data = request.get_json()
    invoice_ids = data.get('invoice_ids', [])
    next_office_id = data.get('next_office_id')
    status = data.get('status', 'Moved to Next Shop')
    loading_date_str = data.get('loading_date')
    
    if not invoice_ids or not next_office_id:
        return jsonify({'message': 'Missing invoice IDs or next office ID'}), 400
        
    try:
        loading_date = datetime.datetime.strptime(loading_date_str, '%Y-%m-%d').date() if loading_date_str else datetime.date.today()
        
        invoices = InvoiceHeader.query.filter(InvoiceHeader.id.in_(invoice_ids)).all()
        status_obj = _get_or_create_group_status(status)
        for inv in invoices:
            inv.current_office_id = next_office_id
            inv.cargo_status_id = status_obj.id
            inv.loading_date = loading_date
            
        db.session.commit()
        return jsonify({'message': f'Successfully moved {len(invoices)} invoices'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error moving cargo', 'error': str(e)}), 500

@loading_list_bp.route('/assign-container', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def assign_container(current_user):
    data = request.get_json()
    invoice_ids = data.get('invoice_ids', [])
    container_number = data.get('container_number')
    container_date_str = data.get('container_date')
    
    if not invoice_ids or not container_number:
        return jsonify({'message': 'Missing invoice IDs or container number'}), 400
        
    try:
        container_date = datetime.datetime.strptime(container_date_str, '%Y-%m-%d').date() if container_date_str else datetime.date.today()
        
        invoices = InvoiceHeader.query.filter(InvoiceHeader.id.in_(invoice_ids)).all()
        for inv in invoices:
            inv.container_number = container_number
            inv.container_date = container_date
            
        db.session.commit()
        return jsonify({'message': f'Successfully assigned container to {len(invoices)} invoices'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error assigning container', 'error': str(e)}), 500

@loading_list_bp.route('/status', methods=['PUT'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def update_status(current_user):
    data = request.get_json()
    invoice_ids = data.get('invoice_ids', [])
    container_number = data.get('container_number')
    status = data.get('status')
    
    if not status:
        return jsonify({'message': 'Missing status'}), 400
        
    if not invoice_ids and not container_number:
        return jsonify({'message': 'Must provide invoice IDs or a container number'}), 400
        
    try:
        query = InvoiceHeader.query
        if container_number:
            query = query.filter(InvoiceHeader.container_number == container_number)
        if invoice_ids:
            query = query.filter(InvoiceHeader.id.in_(invoice_ids))
        invoices = query.all()
        status_obj = _get_or_create_group_status(status)
        event_type = _get_or_create_event_type(status)
        
        # Determine tracking event location
        location_name = data.get('location_name')
        location_id = _resolve_city_location_id(location_name=location_name)
            
        for inv in invoices:
            inv.cargo_status_id = status_obj.id
            
            if inv.tracking_number:
                event = ShipmentTrackingEvent(
                    tracking_id=inv.tracking_number,
                    shipment_group_id=None,
                    location_id=location_id,
                    event_type_id=event_type.id,
                    notes=f"Status updated to {status}",
                    scanned_by=current_user.id
                )
                db.session.add(event)
            
        db.session.commit()
        return jsonify({'message': f'Successfully updated status for {len(invoices)} invoices'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error updating status', 'error': str(e)}), 500

@loading_list_bp.route('/external-tracking', methods=['PUT'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def update_external_tracking(current_user):
    data = request.get_json()
    invoice_id = data.get('invoice_id')
    tracking_number = data.get('external_tracking_number')
    tracking_link = data.get('external_tracking_link')
    
    if not invoice_id:
        return jsonify({'message': 'Missing invoice ID'}), 400
        
    try:
        inv = InvoiceHeader.query.get(invoice_id)
        if not inv:
            return jsonify({'message': 'Invoice not found'}), 404
            
        inv.external_tracking_number = tracking_number
        inv.external_tracking_link = tracking_link
        
        db.session.commit()
        return jsonify({'message': 'Successfully updated external tracking details'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error updating external tracking', 'error': str(e)}), 500
