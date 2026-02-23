from extensions import db
import datetime

class Report(db.Model):
    __tablename__ = 'reports'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), nullable=False) # PDF, Excel, CSV
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    office_id = db.Column(db.Integer, db.ForeignKey('offices.id'), nullable=False, index=True)
    file_path = db.Column(db.String(255)) # Path to file on server (optional if generated on fly)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    office = db.relationship('Office', backref=db.backref('reports', lazy=True))
