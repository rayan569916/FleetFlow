import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your_secret_key_here')

    database_url = os.environ.get('DATABASE_URL', '').strip()
    if database_url:
        SQLALCHEMY_DATABASE_URI = database_url
    else:
        db_host = os.environ.get('DB_HOST', 'host.docker.internal')
        db_port = os.environ.get('DB_PORT', '3306')
        db_user = os.environ.get('DB_USER', 'root')
        db_password = os.environ.get('DB_PASSWORD', '')
        db_name = os.environ.get('DB_NAME', 'fleetflow_db')
        SQLALCHEMY_DATABASE_URI = (
            f'mysql+mysqlconnector://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}'
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 280,
        'pool_pre_ping': True,
    }
    # CORS_ORIGINS = ["http://localhost:4200","http://192.168.1.110:4200"]
