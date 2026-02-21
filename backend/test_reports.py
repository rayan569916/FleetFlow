import requests
import datetime

BASE_URL = "http://127.0.0.1:5000/api"

def test_daily_report():
    print("Testing Daily Report API...")

    # 1. Login to get token
    login_payload = {"username": "admin", "password": "admin123"}
    resp = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if resp.status_code != 200:
        print("Login failed")
        return
    token = resp.json().get("token")
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get today's report
    today = datetime.date.today().isoformat()
    resp = requests.get(f"{BASE_URL}/reports/daily?date={today}", headers=headers)
    print(f"Daily Report GET status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Date: {data['date']}")
        print(f"Total Invoice Grand: {data['total_invoice_grand']}")
        print(f"Bank/Swipe Sum: {data['bank_transfer_swipe_sum']}")
        print(f"Total Payment: {data['total_payment']}")
        print(f"Total Purchase: {data['total_purchase']}")
        print(f"Total Receipt: {data['total_receipt']}")
        print(f"Previous Total: {data['previous_total']}")
        print(f"Daily Total: {data['daily_total']}")
        print(f"Is Stored: {data['is_stored']}")

        # 3. Test Save Report
        if not data['is_stored']:
            print("\nAttempting to save the report...")
            save_resp = requests.post(f"{BASE_URL}/reports/daily/save", json=data, headers=headers)
            print(f"Save Report status: {save_resp.status_code} - {save_resp.text}")

            # Verify it's now stored
            verify_resp = requests.get(f"{BASE_URL}/reports/daily?date={today}", headers=headers)
            if verify_resp.status_code == 200:
                print(f"Is Stored after save: {verify_resp.json()['is_stored']}")

if __name__ == "__main__":
    test_daily_report()
