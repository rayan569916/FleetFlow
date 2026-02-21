from .auth import auth_bp
from .invoices import invoices_bp
from .shipments import shipments_bp
from .finance import finance_bp
from .fleet import fleet_bp
from .dashboard import dashboard_bp
from .general import general_bp
from .reports import reports_bp

def register_routes(app):
    app.register_blueprint(general_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(invoices_bp, url_prefix='/api/invoices')
    app.register_blueprint(shipments_bp, url_prefix='/api/shipments')
    app.register_blueprint(finance_bp, url_prefix='/api/finance')
    app.register_blueprint(fleet_bp, url_prefix='/api/fleet')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
