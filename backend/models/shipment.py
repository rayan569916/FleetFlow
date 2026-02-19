from extensions import db
import datetime

class Shipment(db.Model):
    __tablename__ = 'shipments'
    id = db.Column(db.Integer, primary_key=True)
    tracking_number = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(50), default='Pending')
    origin = db.Column(db.String(100))
    destination = db.Column(db.String(100))
    estimated_delivery = db.Column(db.Date)
    carrier = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
