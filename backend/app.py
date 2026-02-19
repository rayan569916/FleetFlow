from flask import Flask, jsonify
from extensions import db, cors
from config import Config
from routes import register_routes
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    cors.init_app(app, resources={r"/*": {"origins": app.config['CORS_ORIGINS']}}, supports_credentials=True)

    # Register routes
    register_routes(app)

    return app

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        # db.create_all() # Uncomment if you want automatic table creation
        pass
    app.run(debug=True, port=5000)
