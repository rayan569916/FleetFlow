from flask import Blueprint, jsonify, request
from extensions import db
from models.item_list import Item_list, Item_category
from utils.auth import (
    role_required,
    get_effective_read_office_id,
    get_effective_write_office_id,
)

item_list_bp = Blueprint("item_list", __name__)

@item_list_bp.route("/get_item_list", methods=["GET"])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def get_item_list(current_user):
    try:
        search = request.args.get('search', '')
        category_id = request.args.get('category_id', type=int)
        
        query = Item_list.query
        
        if search:
            query = query.filter(Item_list.item_name.ilike(f'%{search}%'))
        
        if category_id:
            query = query.filter(Item_list.category_id == category_id)
            
        items = query.all()
        
        output = []
        for item in items:
            output.append({
                'id': item.id,
                'item_name': item.item_name,
                'category_id': item.category_id,
                'category_name': item.category.category_name if item.category else 'N/A',
            })
        return jsonify({'items': output})
    except Exception as e:
        return jsonify({'message': 'Database error', 'error': str(e)}), 500

@item_list_bp.route("/categories", methods=["GET"])
@role_required(['Super_admin', 'management'])
def get_categories(current_user):
    try:
        categories = Item_category.query.all()
        return jsonify([{'id': c.id, 'category_name': c.category_name} for c in categories])
    except Exception as e:
        return jsonify({'message': 'Error fetching categories', 'error': str(e)}), 500

@item_list_bp.route("/create", methods=["POST"])
@role_required(['Super_admin', 'management'])
def create_item(current_user):
    data = request.get_json()
    if not data or 'item_name' not in data or 'category_id' not in data:
        return jsonify({'message': 'Missing required fields'}), 400
    
    try:
        new_item = Item_list(
            item_name=data['item_name'],
            category_id=data['category_id']
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify({
            'message': 'Item created successfully',
            'item': {
                'id': new_item.id,
                'item_name': new_item.item_name,
                'category_id': new_item.category_id,
                'category_name': new_item.category.category_name if new_item.category else 'N/A'
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error creating item', 'error': str(e)}), 500

@item_list_bp.route("/update/<int:id>", methods=["PUT"])
@role_required(['Super_admin', 'management'])
def update_item(current_user, id):
    data = request.get_json()
    item = Item_list.query.get(id)
    if not item:
        return jsonify({'message': 'Item not found'}), 404
    
    try:
        if 'item_name' in data:
            item.item_name = data['item_name']
        if 'category_id' in data:
            item.category_id = data['category_id']
            
        db.session.commit()
        return jsonify({
            'message': 'Item updated successfully',
            'item': {
                'id': item.id,
                'item_name': item.item_name,
                'category_id': item.category_id,
                'category_name': item.category.category_name if item.category else 'N/A'
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error updating item', 'error': str(e)}), 500

@item_list_bp.route("/delete/<int:id>", methods=["DELETE"])
@role_required(['Super_admin', 'management'])
def delete_item(current_user, id):
    item = Item_list.query.get(id)
    if not item:
        return jsonify({'message': 'Item not found'}), 404
    
    try:
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Item deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error deleting item', 'error': str(e)}), 500