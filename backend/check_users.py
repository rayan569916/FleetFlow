import os
import sys
from sqlalchemy import text
from app import create_app
from extensions import db

def check_users():
    app = create_app()
    with app.app_context():
        # Check roles
        roles = db.session.execute(text('SELECT id, name FROM roles')).all()
        print("Roles in DB:", [(row[0], row[1]) for row in roles])
        
        # Check users
        users = db.session.execute(text('SELECT id, username, role_id FROM users')).all()
        print("Users in DB:", [(row[0], row[1], row[2]) for row in users])

if __name__ == '__main__':
    check_users()
