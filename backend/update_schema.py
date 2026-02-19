from app import app, db
import mysql.connector

def add_column():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="admin",
            password="admin",
            database="fleetflow_db"
        )
        cursor = conn.cursor()
        try:
            cursor.execute("ALTER TABLE user ADD COLUMN full_name VARCHAR(100)")
            conn.commit()
            print("Added 'full_name' column to 'user' table.")
        except mysql.connector.Error as err:
            if "Duplicate column name" in str(err):
                print("'full_name' column already exists.")
            else:
                print(f"Error adding column: {err}")
        
        cursor.close()
        conn.close()
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")

if __name__ == '__main__':
    add_column()
