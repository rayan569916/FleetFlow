from extensions import db
from models.unit_price import Country,City
from models.user import User
from models.invoice import InvoiceHeader
import datetime

class ShipmentGroupStatus(db.Model):
    __tablename__ = 'shipment_group_status'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)


class TrackingEventType(db.Model):
    __tablename__ = 'tracking_event_type'

    id = db.Column(db.Integer, primary_key=True)
    event_type = db.Column(db.String(50), nullable=False)


class ShipmentGroup(db.Model):
    __tablename__ = 'shipment_groups'

    id = db.Column(db.Integer, primary_key=True)
    group_code = db.Column(db.String(50), nullable=False)
    origin = db.Column(db.String(50), nullable=False)
    destination = db.Column(db.String(50), nullable=False)
    loading_date = db.Column(db.Date, nullable=True)

    status_id = db.Column(
        db.Integer,
        db.ForeignKey('shipment_group_status.id'),
        nullable=False
    )

    status = db.relationship(
        'ShipmentGroupStatus',
        backref=db.backref('groups', lazy=True)
    )


class ShipmentGroupRoute(db.Model):
    __tablename__ = 'shipment_group_routes'

    id = db.Column(db.Integer, primary_key=True)

    shipment_group_id = db.Column(
        db.Integer,
        db.ForeignKey('shipment_groups.id'),
        nullable=False
    )

    location_id = db.Column(
        db.Integer,
        db.ForeignKey('city.id'),
        nullable=False
    )

    country_id = db.Column(
        db.Integer,
        db.ForeignKey('country.id'),
        nullable=False
    )

    stop_order = db.Column(db.Integer, nullable=False)

    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    shipment_group = db.relationship(
        'ShipmentGroup',
        backref=db.backref('routes', lazy=True)
    )


class ShipmentTrackingEvent(db.Model):
    __tablename__ = 'shipment_tracking_event'

    id = db.Column(db.Integer, primary_key=True)

    tracking_id = db.Column(
        db.String(50),
        db.ForeignKey('invoice_headers.tracking_number'),
        nullable=False
    )

    shipment_group_id = db.Column(
        db.Integer,
        db.ForeignKey('shipment_groups.id'),
        nullable=True
    )

    location_id = db.Column(
        db.Integer,
        db.ForeignKey('city.id'),
        nullable=False
    )

    event_type_id = db.Column(
        db.Integer,
        db.ForeignKey('tracking_event_type.id'),
        nullable=False
    )

    notes = db.Column(db.String(200))
    
    scanned_by = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),
        nullable=False
    )

    scanned_at = db.Column(
        db.DateTime,
        default=datetime.datetime.utcnow
    )

    shipment_group = db.relationship(
        'ShipmentGroup',
        backref=db.backref('tracking_events', lazy=True, cascade="all, delete-orphan")
    )

    event_type = db.relationship(
        'TrackingEventType',
        backref=db.backref('events', lazy=True)
    )

    scanned_user = db.relationship(
        'User',
        backref=db.backref('scans', lazy=True)
    )

    invoice = db.relationship(
        'InvoiceHeader',
        backref=db.backref('tracking_events', lazy=True, cascade="all, delete-orphan")
    )