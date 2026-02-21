import requests
import datetime
import time

BASE_URL = "http://127.0.0.1:5000/api"

def test_realtime_sync():
    print("Testing Real-time Report Synchronization...")

    # 1. Login
    login_payload = {"username": "admin", "password": "admin123"}
    resp = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    token = resp.json().get("token")
    headers = {"Authorization": f"Bearer {token}"}

    today = datetime.date.today().isoformat()

    # 2. Get initial daily total
    resp = requests.get(f"{BASE_URL}/reports/daily?date={today}", headers=headers)
    initial_total = resp.json()['daily_total']
    print(f"Initial Daily Total: {initial_total}")

    # 3. Create a new payment (should subtract from total)
    print("\nCreating a new payment of 500...")
    payment_payload = {
        "amount": 500.0,
        "description": "Sync Test Payment",
        "category_id": 1 # Assuming category 1 exists
    }
    requests.post(f"{BASE_URL}/finance/payments", json=payment_payload, headers=headers)

    # 4. Verify report updated
    resp = requests.get(f"{BASE_URL}/reports/daily?date={today}", headers=headers)
    new_total = resp.json()['daily_total']
    print(f"New Daily Total: {new_total}")
    
    if new_total == initial_total - 500:
        print("SUCCESS: Payment subtracted from daily report in real-time.")
    else:
        print(f"FAILURE: Expected {initial_total - 500}, but got {new_total}")

    # 5. Delete the payment (should restore total)
    print("\nDeleting the test payment...")
    # Get the last payment ID
    pay_resp = requests.get(f"{BASE_URL}/finance/payments?per_page=1", headers=headers)
    payment_id = pay_resp.json()['items'][0]['id']
    requests.delete(f"{BASE_URL}/finance/payments/{payment_id}", headers=headers)

    # 6. Verify report updated again
    resp = requests.get(f"{BASE_URL}/reports/daily?date={today}", headers=headers)
    final_total = resp.json()['daily_total']
    print(f"Final Daily Total: {final_total}")
    
    if final_total == initial_total:
        print("SUCCESS: Payment deletion restored daily report total in real-time.")
    else:
        print(f"FAILURE: Expected {initial_total}, but got {final_total}")

if __name__ == "__main__":
    test_realtime_sync()
