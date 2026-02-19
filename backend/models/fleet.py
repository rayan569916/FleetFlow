from extensions import db
import datetime

class Driver(db.Model):
    __tablename__ = 'drivers'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Optional link to User login
    name = db.Column(db.String(100), nullable=False)
    license_number = db.Column(db.String(50), unique=True)
    status = db.Column(db.String(20), default='Active') # Active, On Leave, Inactive
    contact_number = db.Column(db.String(20))
    assigned_vehicle = db.Column(db.String(50)) # Could be FK to Vehicle table later
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Tracking(db.Model):
    __tablename__ = 'trackings'
    id = db.Column(db.Integer, primary_key=True)
    tracking_number = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(50), default='Pending') # In Transit, Delivered, etc.
    origin = db.Column(db.String(100))
    destination = db.Column(db.String(100))
    estimated_delivery = db.Column(db.Date)
    current_location = db.Column(db.String(100))
    weight = db.Column(db.String(20))
    service_type = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class LiveTracking(db.Model):
    __tablename__ = 'live_tracking'
    id = db.Column(db.Integer, primary_key=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    speed = db.Column(db.Float) # km/h
    heading = db.Column(db.Float) # degrees
