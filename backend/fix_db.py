from app import create_app
from extensions import db
from models import City, Country

app = create_app()
with app.app_context():
    destination= db.session.query(
        City.name,
        Country.name
    ).join(Country, City.country_id==Country.id).all()

    output=[]

    for d in destination:
        output.append({
            'des':f"{d[0]},{d[1]}"
        })

    print(output)
