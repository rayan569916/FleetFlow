from extensions import db
import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class Customer(db.Model):
    __tablename__='customers'

    
    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), unique=True)

    password_hash = db.Column(db.String(255), nullable=False)

    # Location
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    address = db.Column(db.String(255))
    place_id = db.Column(db.String(255))

    is_active = db.Column(db.Boolean, default=True)
    reset_token = db.Column(db.String(255))
    reset_token_expiry = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "location": {
                "lat": self.lat,
                "lng": self.lng,
                "address": self.address,
                "place_id": self.place_id
            }
        }