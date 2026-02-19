import requests
import json
import datetime

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
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
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

    # Get roles to find CEO role_id
    response = requests.get(f"{BASE_URL}/api/auth/roles", headers=admin_headers)
    roles = response.json()
    ceo_role_id = next((r['id'] for r in roles if r['name'] == 'ceo'), None)
    
    if not ceo_role_id:
        print("Error: CEO role not found in backend.")
        return

    # 2. Register a new user (CEO) with full_name
    print(f"\n[2] Register new CEO user (role_id: {ceo_role_id})")
    register_payload = {
        "username": "ceo_user",
        "password": "ceopassword",
        "role_id": ceo_role_id,
        "full_name": "Chief Executive Officer"
    }
    response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload, headers=admin_headers)
    print(f"Registration status: {response.status_code} - {response.text}")

    # Login as CEO to get token
    ceo_token = None
    response = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "ceo_user", "password": "ceopassword"})
    if response.status_code == 200:
        ceo_token = response.json().get("token")
        print("CEO Login successful.")

    ceo_headers = {"Authorization": f"Bearer {ceo_token}"}

    # 3. Create an Invoice (Accountant/Admin/CEO only)
    print("\n[3] Create Invoice (as Super Admin)")
    invoice_payload = {
        "invoice_number": "INV-" + datetime.datetime.now().strftime("%H%M%S"),
        "amount": 1500.50,
        "date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "description": "Consulting Services",
        "customerName": "Test Customer",
        "email": "test@example.com",
        "phone": "5550101234",
        "address": "123 Test St",
        "city": "Test City",
        "zipCode": "12345",
        "consigneeName": "Test Consignee",
        "consigneeMobile": "5550204321",
        "consigneeAddress": "456 Test Ave",
        "modeOfDelivery": "Air",
        "modeOfPayment": "Cash",
        "items": [{"description": "Service item", "quantity": 1, "unitWeight": 1.0}],
        "totalCartons": 1,
        "totalWeight": 1.0,
        "pricePerKg": 1500.50,
        "subtotal": 1500.50
    }
    response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_payload, headers=admin_headers)
    print(f"Create Invoice status: {response.status_code} - {response.text}")

    # 4. View Invoices (Everyone)
    print("\n[4] View Invoices (as CEO)")
    response = requests.get(f"{BASE_URL}/api/invoices", headers=ceo_headers)
    invoices = response.json().get('invoices', [])
    print(f"View Invoices status: {response.status_code}")
    print(f"Invoices found: {len(invoices)}")
    if invoices:
        invoice_id = invoices[0]['id']
        print(f"Target Invoice ID: {invoice_id}")

    # 5. Delete Invoice (Restricted to Super Admin/CEO)
    # First, let's create a dummy user (Driver) and try to delete
    print("\n[5] Register & Login as Driver (Restricted)")
    requests.post(f"{BASE_URL}/api/auth/register", json={"username": "driver1", "password": "p", "role_id": 5}, headers=admin_headers) # Assuming role_id 5 is driver
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "driver1", "password": "p"})
    driver_token = resp.json().get("token")
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    if invoices:
        print(f"Attempting delete as Driver (Should Fail)...")
        del_resp = requests.delete(f"{BASE_URL}/api/invoices/{invoice_id}", headers=driver_headers)
        print(f"Delete as Driver status: {del_resp.status_code} - {del_resp.text}")

        print(f"Attempting delete as CEO (Should Succeed)...")
        del_resp = requests.delete(f"{BASE_URL}/api/invoices/{invoice_id}", headers=ceo_headers)
        print(f"Delete as CEO status: {del_resp.status_code} - {del_resp.text}")

if __name__ == "__main__":
    test_api()
