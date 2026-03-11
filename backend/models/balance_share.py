from extensions import db
import datetime

class BalanceShareRequest(db.Model):
    __tablename__ = 'balance_share_requests'
    id = db.Column(db.Integer, primary_key=True)
    sender_office_id = db.Column(db.Integer, db.ForeignKey('offices.id'), nullable=False)
    receiver_office_id = db.Column(db.Integer, db.ForeignKey('offices.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    # status = db.Column(db.String(20), default='waiting') # waiting, accepted, cancelled
    comment = db.Column(db.String(255), nullable=True)
    date = db.Column(db.Date, nullable=False, default=datetime.date.today)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    accepted_at = db.Column(db.DateTime, nullable=True)
    
    status = db.Column(db.Integer, db.ForeignKey('balance_share_types.id'), nullable=False)
    sender_office = db.relationship('Office', foreign_keys=[sender_office_id], backref=db.backref('sent_share_requests', lazy=True))
    receiver_office = db.relationship('Office', foreign_keys=[receiver_office_id], backref=db.backref('received_share_requests', lazy=True))


class BalanceShareType(db.Model):
    __tablename__ = 'balance_share_types'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(255), nullable=True)