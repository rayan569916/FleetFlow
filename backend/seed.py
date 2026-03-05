from app import create_app
from extensions import db

# import your models
from models.finance import PaymentCategory, ReceiptCategory, PurchaseCategory
from models.user import Office
from models.user import Role
from models.item_list import Item_category

app = create_app()

def seed_categories():
    print("Seeding categories...")

    payment_data = ["Fuel", "Salary", "Maintenance", "Insurance", "Toll", "Other"]
    receipt_data = ["Customer Payment", "Advance", "Other"]
    purchase_data = ["Office Supplies", "Equipment","Other"]
    office_data=[{"name":"Captain Cargo Riyadh Office","location":"Riyadh, Saudi Arabia"},
                {"name":"Captain Cargo Makkah Office","location":"Makkah, Saudi Arabia"},
                {"name":"Captain Cargo Jeddah Office","location":"Jeddah, Saudi Arabia"},
                {"name":"Captain Cargo Tabuk Office","location":"Tabuk, Saudi Arabia"},
                {"name":"Captain Cargo Najran Office","location":"Najran, Saudi Arabia"},
                {"name":"Captain Cargo Al Baha Office","location":"Al Baha, Saudi Arabia"},
                {"name":"Captain Cargo Abha Office","location":"Abha, Saudi Arabia"},
                {"name":"Captain Cargo Buraidah Office","location":"Buraidah, Saudi Arabia"}
                ]

    role_data=[{"name":"super_admin"}
    ,{"name":"accountant"}
    ,{"name":"ceo"}
    ,{"name":"driver"}
    ,{"name":"hr"}
    ,{"name":"staff"}]

    item_category_data=[{"name":"Apparel"}
    ,{"name":"Baby"}
    ,{"name":"Electronics"}
    ,{"name":"Food"}
    ,{"name":"Health"}
    ,{"name":"Household"}
    ,{"name":"Industrial"}
    ,{"name":"Personal"}]

    for item_category in item_category_data:
        exists = Item_category.query.filter_by(name=item_category['name']).first()
        if not exists:
            db.session.add(Item_category(name=item_category['name']))

    for role in role_data:
        exists = Role.query.filter_by(name=role['name']).first()
        if not exists:
            db.session.add(Role(name=role['name']))

    for office in office_data:
        exists = Office.query.filter_by(name=office['name']).first()
        if not exists:
            db.session.add(Office(name=office['name'], location=office['location']))

    # Payment Categories
    for name in payment_data:
        exists = PaymentCategory.query.filter_by(name=name).first()
        if not exists:
            db.session.add(PaymentCategory(name=name))

    # Receipt Categories
    for name in receipt_data:
        exists = ReceiptCategory.query.filter_by(name=name).first()
        if not exists:
            db.session.add(ReceiptCategory(name=name))

    # Purchase Categories
    for name in purchase_data:
        exists = PurchaseCategory.query.filter_by(name=name).first()
        if not exists:
            db.session.add(PurchaseCategory(name=name))

    db.session.commit()
    print("Categories seeded!")


def run_seed():
    with app.app_context():
        seed_categories()


if __name__ == "__main__":
    run_seed()