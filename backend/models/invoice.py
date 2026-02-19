from extensions import db
import datetime

class InvoiceHeader(db.Model):
    __tablename__ = 'invoice_headers'
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='Pending') # Pending, Paid, Canceled
    tracking_number = db.Column(db.String(50), nullable=True)
    mode_of_delivery = db.Column(db.String(50))
    mode_of_payment = db.Column(db.String(50))
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    customer = db.relationship('InvoiceCustomerDetail', backref='header', uselist=False, cascade="all, delete-orphan")
    items = db.relationship('InvoiceItem', backref='header', cascade="all, delete-orphan")
    amount_detail = db.relationship('InvoiceAmountDetail', backref='header', uselist=False, cascade="all, delete-orphan")
    creator = db.relationship('User', backref='invoices_created')

class InvoiceCustomerDetail(db.Model):
    __tablename__ = 'invoice_customers'
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice_headers.id'), nullable=False)
    
    # Sender Information
    sender_name = db.Column(db.String(100), nullable=False)
    sender_email = db.Column(db.String(100))
    sender_phone = db.Column(db.String(50))
    sender_address = db.Column(db.String(200))
    sender_city = db.Column(db.String(100))
    sender_zip = db.Column(db.String(20))
    
    # Consignee Information
    consignee_name = db.Column(db.String(100), nullable=False)
    consignee_mobile = db.Column(db.String(50))
    consignee_address = db.Column(db.String(200))

class InvoiceItem(db.Model):
    __tablename__ = 'invoice_items'
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice_headers.id'), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    unit_weight = db.Column(db.Float, nullable=True)

class InvoiceAmountDetail(db.Model):
    __tablename__ = 'invoice_amounts'
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice_headers.id'), nullable=False)
    
    total_cartons = db.Column(db.Integer, default=1)
    total_weight = db.Column(db.Float, default=0.0)
    price_per_kg = db.Column(db.Float, default=0.0)
    
    customs_charge = db.Column(db.Float, default=0.0)
    bill_charge = db.Column(db.Float, default=0.0)
    packing_charge = db.Column(db.Float, default=0.0)
    discount = db.Column(db.Float, default=0.0)
    
    subtotal = db.Column(db.Float, nullable=False)
    grand_total = db.Column(db.Float, nullable=False)
