from extensions import db


class Item_category(db.Model):
    __tablename__ = "item_categories"

    id = db.Column(db.Integer, primary_key=True)
    category_name = db.Column(db.String(50), nullable=False, unique=True)

    # One category -> many items
    items = db.relationship("Item_list", backref="category", lazy=True)


class Item_list(db.Model):
    __tablename__ = "items_list"

    id = db.Column(db.Integer, primary_key=True)
    item_name = db.Column(db.String(100), nullable=False)

    category_id = db.Column(
        db.Integer,
        db.ForeignKey("item_categories.id"),
        nullable=False
    )
