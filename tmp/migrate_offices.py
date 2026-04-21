import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

# Use same logic as Config class but for direct connection
db_host = os.getenv("LOCAL_DB_HOST", "127.0.0.1")
db_port = int(os.getenv("LOCAL_DB_PORT", 3306))
db_user = os.getenv("LOCAL_DB_USER", "root")
db_password = os.getenv("LOCAL_DB_PASSWORD", "root")
db_name = os.getenv("LOCAL_DB_NAME", "fleetflow_db")

try:
    conn = mysql.connector.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        password=db_password,
        database=db_name
    )
    cursor = conn.cursor()
    
    # Add location_id
    try:
        sql = "ALTER TABLE offices ADD COLUMN location_id INT NULL;"
        cursor.execute(sql)
        print("Successfully added location_id to offices table.")
    except mysql.connector.Error as err:
        if err.errno == 1060: # Duplicate column name
            print("Column location_id already exists.")
        else:
            raise err

    # Add foreign key constraint
    try:
        sql = "ALTER TABLE offices ADD CONSTRAINT fk_offices_city FOREIGN KEY (location_id) REFERENCES city(id);"
        cursor.execute(sql)
        print("Successfully added foreign key constraint to offices table.")
    except mysql.connector.Error as err:
        if err.errno == 1061: # Duplicate key name
            print("Foreign key constraint already exists.")
        else:
            raise err

    conn.commit()
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Migration failed: {str(e)}")
