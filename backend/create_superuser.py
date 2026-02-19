from app import create_app
from extensions import db
from models import User, Role
import os
from dotenv import load_dotenv

load_dotenv()

def create_superuser(username, password, full_name):
    app = create_app()
    with app.app_context():
        # Get admin role
        admin_role = Role.query.filter_by(name='super_admin').first()
        if not admin_role:
            print("Error: 'super_admin' role not found. Run init_db.py first.")
            return

        user = User.query.filter_by(username=username).first()
        if user:
            print(f"User '{username}' already exists. Updating password...")
            user.set_password(password)
            user.role_id = admin_role.id
            user.full_name = full_name
        else:
            print(f"Creating new superuser '{username}'...")
            user = User(
                username=username,
                role_id=admin_role.id,
                full_name=full_name
            )
            user.set_password(password)
            db.session.add(user)
        
        db.session.commit()
        print(f"Superuser '{username}' ready with password: {password}")

if __name__ == "__main__":
    import sys
    # Default values or allow CLI args
    u = sys.argv[1] if len(sys.argv) > 1 else "admin"
    p = sys.argv[2] if len(sys.argv) > 2 else "admin123"
    f = sys.argv[3] if len(sys.argv) > 3 else "System Administrator"
    
    create_superuser(u, p, f)
