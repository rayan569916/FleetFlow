from pywebpush import webpush, WebPushException
import json
from flask import current_app

def send_push_notification(subscription_info, message_body):
    """
    Sends a push notification to a specific subscription.
    Returns (success, status_code)
    """
    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(message_body),
            vapid_private_key=current_app.config.get('VAPID_PRIVATE_KEY'),
            vapid_claims={"sub": current_app.config.get('VAPID_CLAIM_EMAIL', "mailto:admin@captaincargo.co")}
        )
        print("Push notification sent successfully")
        return True, 201
    except WebPushException as ex:
        print(f"WebPush error: {ex}")
        if ex.response is not None:
            print(f"Status code: {ex.response.status_code}")
            return False, ex.response.status_code
        return False, None
    except Exception as e:
        print(f"Error sending push: {e}")
        return False, None