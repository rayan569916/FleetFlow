from flask import Blueprint, jsonify
from models.user import Office

general_bp = Blueprint('general', __name__)

@general_bp.route('/', methods=['GET'])
def index():
    return jsonify({
        'message': 'Captain Cargo Backend is running!',
        'status': 'active'
    })

@general_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

@general_bp.route('/offices', methods=['GET'])
def get_offices():
    offices = Office.query.all()
    return jsonify([{'id': o.id, 'name': o.name} for o in offices])
