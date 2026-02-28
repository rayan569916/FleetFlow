from flask import Flask, jsonify
from extensions import db, cors
from config import Config
from routes import register_routes
from dotenv import load_dotenv
from flask_migrate import Migrate

load_dotenv()
migrate=Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    # cors.init_app(app, resources={r"/*": {"origins": app.config['CORS_ORIGINS']}}, supports_credentials=True)
    migrate.init_app(app, db)
    # Register routes
    register_routes(app)
    
    # Register centralized error handlers
    register_error_handlers(app)

    return app

def register_error_handlers(app: Flask):
    """Register consistent JSON error responses for common HTTP errors."""

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'message': 'Bad request', 'error': str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({'message': 'Unauthorized', 'error': str(e)}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({'message': 'Forbidden', 'error': str(e)}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'message': 'Resource not found', 'error': str(e)}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'message': 'Method not allowed', 'error': str(e)}), 405

    @app.errorhandler(Exception)
    def internal_error(e):
        # Log the full traceback for server-side debugging
        app.logger.exception('Unhandled exception: %s', e)
        return jsonify({'message': 'An internal server error occurred'}), 500

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        # db.create_all() # Uncomment if you want automatic table creation
        pass
    app.run(host='0.0.0.0', port=5000)
