from .auth import auth_bp
from .invoices import invoices_bp
from .shipments import shipments_bp
from .finance import finance_bp
from .fleet import fleet_bp
from .dashboard import dashboard_bp
from .general import general_bp
from .reports import reports_bp
from .unit_price import unit_price_bp
from .item_list import item_list_bp
from .balance_share import balance_share_bp
from .tracking import tracking_bp
from .loading_list import loading_list_bp
from .auth_mobile import auth_mobile_bp
from .customer_support_details import customer_support_details_bp
from .cargo_mobile import cargo_mobile_bp
from .cargo_dashboard import cargo_dashboard_bp
from .featured_offers import featured_offers_bp

def register_routes(app):
    app.register_blueprint(general_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(invoices_bp, url_prefix='/api/invoices')
    app.register_blueprint(shipments_bp, url_prefix='/api/shipments')
    app.register_blueprint(finance_bp, url_prefix='/api/finance')
    app.register_blueprint(fleet_bp, url_prefix='/api/fleet')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(unit_price_bp, url_prefix='/api/unit_price')
    app.register_blueprint(item_list_bp, url_prefix='/api/item_list')
    app.register_blueprint(balance_share_bp, url_prefix='/api/balance_share')
    app.register_blueprint(tracking_bp, url_prefix='/api/tracking')
    app.register_blueprint(loading_list_bp, url_prefix='/api/loading-list')
    app.register_blueprint(auth_mobile_bp, url_prefix='/mobile/auth_mobile')
    app.register_blueprint(cargo_mobile_bp, url_prefix='/mobile/requests')
    app.register_blueprint(cargo_dashboard_bp, url_prefix='/api/cargo_requests')
    app.register_blueprint(featured_offers_bp, url_prefix='/api/featured_offers')
    app.register_blueprint(customer_support_details_bp, url_prefix='/mobile/customer_support_details')
