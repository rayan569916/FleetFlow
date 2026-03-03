import os


class Config:
    """
    Local testing configuration (no managed DB SSL settings).
    Use this file when running against a local MySQL instance.
    """
    SECRET_KEY = os.getenv("SECRET_KEY", "local-dev-secret")

    DB_HOST = os.getenv("LOCAL_DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("LOCAL_DB_PORT", 3306))
    DB_USER = os.getenv("LOCAL_DB_USER", "root")
    DB_PASSWORD = os.getenv("LOCAL_DB_PASSWORD", "root")
    DB_NAME = os.getenv("LOCAL_DB_NAME", "fleetflow_db")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 280,
        "pool_pre_ping": True,
    }

