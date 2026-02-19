from flask import Blueprint, jsonify

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
