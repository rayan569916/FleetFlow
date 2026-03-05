import os
import sys

# Add the directory containing app.py to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from extensions import db
from models.user import User, Role
from sqlalchemy import text

def update_db():
    with app.app_context():
        # 1. Delete all users EXCEPT 'admin'
        admin_user = User.query.filter_by(username='admin').first()
        
        if admin_user:
            users_to_delete = User.query.filter(User.id != admin_user.id).all()
        else:
            print("Warning: 'admin' user not found. Deleting ALL users.")
            users_to_delete = User.query.all()

        for user in users_to_delete:
            db.session.delete(user)
        db.session.commit()
        print(f"Deleted {len(users_to_delete)} users.")

        # 2. Insert the 4 new roles if they don't exist
        roles_to_create = ['Super_admin', 'management', 'shop_manager', 'driver']
        for role_name in roles_to_create:
            if not Role.query.filter_by(name=role_name).first():
                new_role = Role(name=role_name)
                db.session.add(new_role)
        db.session.commit()
        print("Ensured new roles exist.")

        # 3. Assign 'Super_admin' to the 'admin' user (if they exist)
        if admin_user:
            super_admin_role = Role.query.filter_by(name='Super_admin').first()
            admin_user.role_id = super_admin_role.id
            db.session.commit()
            print("Assigned Super_admin to admin user.")

        # 4. Delete all old roles that we just deprecated, using raw SQL to avoid ORM cascades
        db.session.execute(text("DELETE FROM roles WHERE name NOT IN ('Super_admin', 'management', 'shop_manager', 'driver')"))
        db.session.commit()
        print("Deleted old unused roles.")

if __name__ == '__main__':
    update_db()
