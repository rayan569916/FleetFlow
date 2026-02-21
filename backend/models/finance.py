from extensions import db
import datetime

class PurchaseCategory(db.Model):
    __tablename__ = 'purchase_categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

class ReceiptCategory(db.Model):
    __tablename__ = 'receipt_categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

class PaymentCategory(db.Model):
    __tablename__ = 'payment_categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

class Purchase(db.Model):
    __tablename__ = 'purchases'
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(200))
    category_id = db.Column(db.Integer, db.ForeignKey('purchase_categories.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    category = db.relationship('PurchaseCategory', backref=db.backref('purchases', lazy=True))

class Receipt(db.Model):
    __tablename__ = 'receipts'
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(200))
    category_id = db.Column(db.Integer, db.ForeignKey('receipt_categories.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    category = db.relationship('ReceiptCategory', backref=db.backref('receipts', lazy=True))

class Payment(db.Model):
    __tablename__ = 'payments'
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(200))
    category_id = db.Column(db.Integer, db.ForeignKey('payment_categories.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    category = db.relationship('PaymentCategory', backref=db.backref('payments', lazy=True))

class DailyReport(db.Model):
    __tablename__ = 'daily_reports'
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, unique=True, nullable=False)
    # Calculation elements:
    total_invoice_grand = db.Column(db.Float, default=0.0)      # Sum of all grand_total
    bank_transfer_swipe_sum = db.Column(db.Float, default=0.0)  # Sum of grand_total for 'bank_transfer' & 'swipe'
    total_payment = db.Column(db.Float, default=0.0)           # Sum of Payments
    total_purchase = db.Column(db.Float, default=0.0)          # Sum of Purchases
    total_receipt = db.Column(db.Float, default=0.0)           # Sum of Receipts
    previous_total = db.Column(db.Float, default=0.0)
    
    # Final Result: (total_invoice_grand - bank_transfer_swipe_sum - total_payment - total_purchase + total_receipt + previous_total)
    daily_total = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
