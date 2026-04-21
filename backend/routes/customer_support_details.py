from flask import Blueprint
from services.whatsapp_service import support_contact_details

customer_support_details_bp = Blueprint('customer_support_details', __name__)

@customer_support_details_bp.route('', methods=['GET'])
def get_support_contacts():
    return support_contact_details()
