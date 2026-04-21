
import os
import json
from twilio.rest import Client
from dotenv import load_dotenv
from flask import jsonify

# Load .env variables
load_dotenv()

# Environment variables
ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")

CONTENT_SID  = os.getenv("TWILIO_CONTENT_SID")  # optional

# Sandbox: +14155238886  |  Production: your approved WhatsApp Business number
WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "+14155238886")

# Initialize client
client = None
if not ACCOUNT_SID or not AUTH_TOKEN:
    print("[WARNING] Twilio credentials not set properly. WhatsApp features will be disabled.")
else:
    try:
        client = Client(ACCOUNT_SID, AUTH_TOKEN)
    except Exception as e:
        print(f"[ERROR] Failed to initialize Twilio client: {e}")


# =========================
# SEND RAW WHATSAPP MESSAGE (RECOMMENDED FOR NOW)
# =========================
def send_whatsapp_message(to, body):
    """
    Send a simple WhatsApp message (works in sandbox after opt-in)
    :param to: Phone number (+966...)
    :param body: Message text

    SANDBOX REQUIREMENT: The recipient must first opt-in by sending
    the join keyword to whatsapp:+14155238886 before messages are delivered.
    """
    if not client:
        print("[ERROR] Twilio client not initialized. Cannot send message.")
        return None

    try:
        message = client.messages.create(
            body=body,
            from_=f'whatsapp:{WHATSAPP_FROM}',
            to=f'whatsapp:{to}'
        )

        print(f"[OK] Message queued. SID: {message.sid}")
        print(f"   -> To: {to}")
        print(f"   -> Status: {message.status}")
        print(f"   -> Error code: {message.error_code}")
        print(f"   -> Error message: {message.error_message}")
        return message.sid

    except Exception as e:
        print(f"[ERROR] Error sending WhatsApp message: {e}")
        return None


def check_message_status(sid):
    """
    Fetch the delivery status of a previously sent message by SID.
    Useful for debugging undelivered messages.
    Possible statuses: queued, sent, delivered, failed, undelivered
    """
    try:
        message = client.messages(sid).fetch()
        print(f"[STATUS] Message Status for {sid}:")
        print(f"   -> Status       : {message.status}")
        print(f"   -> Error code   : {message.error_code}")
        print(f"   -> Error message: {message.error_message}")
        print(f"   -> To           : {message.to}")
        print(f"   -> From         : {message.from_}")
        return {
            "status": message.status,
            "error_code": message.error_code,
            "error_message": message.error_message,
        }
    except Exception as e:
        print(f"[ERROR] Could not fetch message status: {e}")
        return None


# =========================
# SEND TEMPLATE MESSAGE (FOR PRODUCTION)
# =========================
def send_whatsapp_template(to, variables):
    """
    Send WhatsApp template message (requires approved template)
    :param to: Phone number (+966...)
    :param variables: dict {"1": "value1", "2": "value2"}
    """
    if not client:
        print("[ERROR] Twilio client not initialized. Cannot send template.")
        return None

    try:
        if not CONTENT_SID:
            raise Exception("[ERROR] CONTENT_SID not configured")

        message = client.messages.create(
            from_=f'whatsapp:{WHATSAPP_FROM}',
            to=f'whatsapp:{to}',
            content_sid=CONTENT_SID,
            content_variables=json.dumps(variables)
        )

        print(f"[OK] Template message sent. SID: {message.sid}")
        return message.sid

    except Exception as e:
        print(f"[ERROR] Error sending template message: {e}")
        return None



def support_contact_details():
    return jsonify({
        'phone': '0543764900',
        'email': 'info@captaincargo.co',
        'whatsapp': '0543764900',
        'message_template':"Hi, I need help with my shipment",
        'office': {
            'name': 'Main Office',
            'address': 'Khalidiya tower 4, Floor 16, Riyadh, Saudi Arabia',
        },
    })