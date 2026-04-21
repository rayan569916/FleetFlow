from extensions import db

class Country(db.Model):
    __tablename__ = 'country'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)

class Postal_code(db.Model):
    __tablename__= 'postal_code'
    id = db.Column(db.Integer, primary_key=True)
    statename = db.Column(db.String(100), nullable=False)
    district = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    pincode = db.Column(db.Integer, nullable=False)

class City(db.Model):
    __tablename__ = 'city'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    country_id = db.Column(db.Integer, db.ForeignKey('country.id'), nullable=False)
    country = db.relationship('Country', backref=db.backref('cities', lazy=True))

class Unit_price(db.Model):
    __tablename__ = 'unit_price'
    id = db.Column(db.Integer, primary_key=True)
    air_price = db.Column(db.Float, nullable=False)
    sea_price = db.Column(db.Float, nullable=False)
    bill_charge= db.Column(db.Float, nullable=False)
    packing_charge= db.Column(db.Float, nullable=False)
    country_id = db.Column(db.Integer, db.ForeignKey('country.id'), nullable=False)
    country = db.relationship('Country', backref='unit_prices')
    