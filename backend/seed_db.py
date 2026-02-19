from app import app, db, User

def seed_users():
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()

        existing_users = User.query.all()
        print(f"Existing users count: {len(existing_users)}")
        for u in existing_users:
            print(f"- {u.username} ({u.role})")

        users_to_add = [
            {"username": "admin", "password": "password123", "role": "super_admin", "full_name": "Super Admin"},
            {"username": "ceo_john", "password": "password123", "role": "ceo", "full_name": "John CEO"},
            {"username": "hr_sarah", "password": "password123", "role": "hr", "full_name": "Sarah HR"},
            {"username": "acct_mike", "password": "password123", "role": "accountant", "full_name": "Mike Accountant"},
            {"username": "driver_bob", "password": "password123", "role": "driver", "full_name": "Bob Driver"},
            {"username": "driver_alice", "password": "password123", "role": "driver", "full_name": "Alice Driver"},
            {"username": "staff_tom", "password": "password123", "role": "staff", "full_name": "Tom Staff"}
        ]

        added_count = 0
        for u_data in users_to_add:
            if not User.query.filter_by(username=u_data['username']).first():
                user = User(username=u_data['username'], role=u_data['role'], full_name=u_data['full_name'])
                user.set_password(u_data['password'])
                db.session.add(user)
                added_count += 1
                print(f"Added user: {u_data['username']}")
        
        if added_count > 0:
            db.session.commit()
            print(f"Database seeded successfully with {added_count} new users.")
        else:
            print("All dummy users already exist.")

if __name__ == '__main__':
    seed_users()
