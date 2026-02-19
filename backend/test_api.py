import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_api():
    print("Testing API Endpoints with Invoices & RBAC...")

    # 1. Login as Super Admin
    print("\n[1] Login as Super Admin")
    login_payload = {
        "username": "admin",
        "password": "admin123"
    }
    token = None
    try:
        response = requests.post(f"{BASE_URL}/login", json=login_payload)
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            role = data.get("role")
            username = data.get("username")
            full_name = data.get("full_name")
            print(f"Login successful. Role: {role}, Username: {username}, Full Name: {full_name}")
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return
    except requests.exceptions.ConnectionError:
        print("Failed to connect to the server. Is it running?")
        return

    admin_headers = {
        "Authorization": f"Bearer {token}"
    }

    # 2. Register a new user (CEO) with full_name
    print("\n[2] Register new CEO user")
    register_payload = {
        "username": "ceo_user",
        "password": "ceopassword",
        "role": "ceo",
        "full_name": "Chief Executive Officer"
    }
    response = requests.post(f"{BASE_URL}/register", json=register_payload, headers=admin_headers)
    print(f"Registration status: {response.status_code} - {response.text}")

    # Login as CEO to get token
    ceo_token = None
    response = requests.post(f"{BASE_URL}/login", json={"username": "ceo_user", "password": "ceopassword"})
    if response.status_code == 200:
        ceo_token = response.json().get("token")
        print("CEO Login successful.")

    ceo_headers = {"Authorization": f"Bearer {ceo_token}"}

    # 3. Create an Invoice (Accountant/Admin/CEO only)
    print("\n[3] Create Invoice (as Super Admin)")
    invoice_payload = {
        "invoice_number": "INV-001",
        "amount": 1500.50,
        "date": "2023-10-27",
        "description": "Consulting Services"
    }
    response = requests.post(f"{BASE_URL}/invoices", json=invoice_payload, headers=admin_headers)
    print(f"Create Invoice status: {response.status_code} - {response.text}")

    # 4. View Invoices (Everyone)
    print("\n[4] View Invoices (as CEO)")
    response = requests.get(f"{BASE_URL}/invoices", headers=ceo_headers)
    invoices = response.json().get('invoices', [])
    print(f"View Invoices status: {response.status_code}")
    print(f"Invoices found: {len(invoices)}")
    if invoices:
        invoice_id = invoices[0]['id']
        print(f"Target Invoice ID: {invoice_id}")

    # 5. Delete Invoice (Restricted to Super Admin/CEO)
    # First, let's create a dummy user (Driver) and try to delete
    print("\n[5] Register & Login as Driver (Restricted)")
    requests.post(f"{BASE_URL}/register", json={"username": "driver1", "password": "p", "role": "driver"}, headers=admin_headers)
    resp = requests.post(f"{BASE_URL}/login", json={"username": "driver1", "password": "p"})
    driver_token = resp.json().get("token")
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    if invoices:
        print(f"Attempting delete as Driver (Should Fail)...")
        del_resp = requests.delete(f"{BASE_URL}/invoices/{invoice_id}", headers=driver_headers)
        print(f"Delete as Driver status: {del_resp.status_code} - {del_resp.text}")

        print(f"Attempting delete as CEO (Should Succeed)...")
        del_resp = requests.delete(f"{BASE_URL}/invoices/{invoice_id}", headers=ceo_headers)
        print(f"Delete as CEO status: {del_resp.status_code} - {del_resp.text}")

if __name__ == "__main__":
    test_api()
