from flask import Blueprint, request, jsonify
from extensions import db
from models.unit_price import Unit_price, Country, City
from utils.auth import role_required

unit_price_bp = Blueprint('unit_price', __name__)

@unit_price_bp.route('/list_unit_price', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def list_unit_price(current_user):
    try:
        unit_prices = Unit_price.query.all()
        output = []
        for unit_price in unit_prices:
            output.append({
                'id': unit_price.id,
                'air_price': unit_price.air_price,
                'sea_price': unit_price.sea_price,
                'bill_charge': unit_price.bill_charge,
                'packing_charge': unit_price.packing_charge,
                'country': unit_price.country.name if unit_price.country else None,
            })
        return jsonify({'unit_prices': output})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@unit_price_bp.route('/countries', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def list_countries(current_user):
    try:
        countries = Country.query.all()
        return jsonify([country.name for country in countries])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@unit_price_bp.route('/cities', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager', 'driver'])
def list_cities(current_user):
    try:
        country_name = request.args.get('country')
        query = request.args.get('q', '')

        city_query = City.query
        
        if country_name:
            city_query = city_query.join(Country).filter(Country.name.ilike(country_name))
        
        if query:
            city_query = city_query.filter(City.name.ilike(f'%{query}%'))
        
        cities = city_query.limit(50).all()
        return jsonify([city.name for city in cities])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@unit_price_bp.route('', methods=['POST'])
@role_required(['Super_admin', 'management'])
def create_unit_price(current_user):
    data = request.get_json() or {}

    country_name = (data.get('country') or '').strip()
    air_price = data.get('air_price')
    sea_price = data.get('sea_price')
    bill_charge = data.get('bill_charge')
    packing_charge = data.get('packing_charge')

    if not country_name:
        return jsonify({'message': 'country is required'}), 400
    if air_price is None or sea_price is None:
        return jsonify({'message': 'air_price and sea_price are required'}), 400

    try:
        # Check if country already exists
        existing_country = Country.query.filter(Country.name.ilike(country_name)).first()
        if existing_country:
            return jsonify({'message': 'country already exist'}), 400

        # Create new country
        new_country = Country(name=country_name)
        db.session.add(new_country)
        db.session.flush() # Get the country ID

        new_entry = Unit_price(
            country_id=new_country.id,
            air_price=float(air_price),
            sea_price=float(sea_price),
            bill_charge=float(bill_charge),
            packing_charge=float(packing_charge)
        )
        db.session.add(new_entry)
        db.session.commit()

        return jsonify({
            'message': 'Unit price created',
            'unit_price': {
                'id': new_entry.id,
                'country': new_country.name,
                'air_price': new_entry.air_price,
                'sea_price': new_entry.sea_price,
                'bill_charge': new_entry.bill_charge,
                'packing_charge': new_entry.packing_charge
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to create unit price', 'error': str(e)}), 500

@unit_price_bp.route('/<int:id>', methods=['PUT'])
@role_required(['Super_admin', 'management'])
def update_unit_price(current_user, id):
    data = request.get_json() or {}
    unit_price = Unit_price.query.get(id)

    if not unit_price:
        return jsonify({'message': 'Unit price not found'}), 404

    if 'country' in data:
        country_name = (data.get('country') or '').strip()
        if not country_name:
            return jsonify({'message': 'country cannot be empty'}), 400
        
        # In case we want to update the country name as well
        if unit_price.country:
            unit_price.country.name = country_name
        else:
            # This case shouldn't happen with proper relations but good to have
            new_country = Country(name=country_name)
            db.session.add(new_country)
            db.session.flush()
            unit_price.country_id = new_country.id

    if 'air_price' in data:
        unit_price.air_price = float(data.get('air_price'))

    if 'sea_price' in data:
        unit_price.sea_price = float(data.get('sea_price'))

    if 'bill_charge' in data:
        unit_price.bill_charge = float(data.get('bill_charge'))

    if 'packing_charge' in data:
        unit_price.packing_charge = float(data.get('packing_charge'))

    try:
        db.session.commit()
        return jsonify({
            'message': 'Unit price updated',
            'unit_price': {
                'id': unit_price.id,
                'country': unit_price.country.name if unit_price.country else country_name,
                'air_price': unit_price.air_price,
                'sea_price': unit_price.sea_price,
                'bill_charge': unit_price.bill_charge,
                'packing_charge': unit_price.packing_charge
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Failed to update unit price', 'error': str(e)}), 500

