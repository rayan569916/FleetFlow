from extensions import db
import datetime

class CargoRequest(db.Model):
    __tablename__ = 'cargo_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    
    # Location Info
    pickup_address = db.Column(db.String(300), nullable=False)
    pickup_lat = db.Column(db.Float, nullable=True)
    pickup_lng = db.Column(db.Float, nullable=True)
    pickup_place_id = db.Column(db.String(255), nullable=True)
    
    dropoff_address = db.Column(db.String(300), nullable=False)
    dropoff_lat = db.Column(db.Float, nullable=True)
    dropoff_lng = db.Column(db.Float, nullable=True)
    dropoff_place_id = db.Column(db.String(255), nullable=True)
    
    # Cargo Details
    cargo_description = db.Column(db.String(500), nullable=False)
    estimated_weight = db.Column(db.Float, nullable=True)
    number_of_packages = db.Column(db.Integer, default=1)
    
    # Status
    status = db.Column(db.String(50), default='Pending') # Pending, Accepted, Invoice_Created, Canceled
    
    auth_driver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Driver who handled it
    office_id = db.Column(db.Integer, db.ForeignKey('offices.id'), nullable=True) # Office tracking this request
    
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    customer = db.relationship('Customer', backref=db.backref('cargo_requests', lazy=True))
    driver = db.relationship('User', backref=db.backref('handled_requests', lazy=True))
    office = db.relationship('Office', backref=db.backref('cargo_requests', lazy=True))
