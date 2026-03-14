import os
from flask import Flask
from extensions import db
from models.push_subscription import PushSubscription
from config_local import Config

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    subs = PushSubscription.query.all()
    print(f"Total subscriptions: {len(subs)}")
    for sub in subs:
        print(f"ID: {sub.id}, UserID: {sub.user_id}, Endpoint: {sub.endpoint[:50]}...")
