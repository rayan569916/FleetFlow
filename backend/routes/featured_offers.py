import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from extensions import db
from models.featured_offer import FeaturedOffer
from utils.auth import role_required

featured_offers_bp = Blueprint('featured_offers', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'offers')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
# Mobile banner aspect ratio 16:9, rendered at ~360px wide on most phones
BANNER_WIDTH = 900
BANNER_HEIGHT = 506  # 16:9


def _allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _crop_and_save(file_storage) -> str:
    """Crop uploaded image to 16:9 and save. Returns the relative filename."""
    try:
        from PIL import Image
        import io

        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        img = Image.open(file_storage.stream).convert('RGB')

        src_w, src_h = img.size
        target_ratio = BANNER_WIDTH / BANNER_HEIGHT

        if src_w / src_h > target_ratio:
            # Wider than target → crop sides
            new_w = int(src_h * target_ratio)
            left = (src_w - new_w) // 2
            img = img.crop((left, 0, left + new_w, src_h))
        else:
            # Taller than target → crop top/bottom
            new_h = int(src_w / target_ratio)
            top = (src_h - new_h) // 2
            img = img.crop((0, top, src_w, top + new_h))

        img = img.resize((BANNER_WIDTH, BANNER_HEIGHT), Image.LANCZOS)

        filename = f"{uuid.uuid4().hex}.jpg"
        save_path = os.path.join(UPLOAD_FOLDER, filename)
        img.save(save_path, 'JPEG', quality=88, optimize=True)
        return filename
    except ImportError:
        # PIL not available — save file as-is
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        ext = file_storage.filename.rsplit('.', 1)[-1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        file_storage.stream.seek(0)
        file_storage.save(os.path.join(UPLOAD_FOLDER, filename))
        return filename


def _build_image_url(filename: str) -> str:
    return f"/api/featured_offers/uploads/{filename}"


# ── Serve uploaded images ─────────────────────────────────────────────────────
@featured_offers_bp.route('/uploads/<path:filename>', methods=['GET'])
def serve_offer_image(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# ── Public: list active offers (used by mobile) ───────────────────────────────
@featured_offers_bp.route('/public', methods=['GET'])
def list_active_offers():
    offers = FeaturedOffer.query.filter_by(is_active=True).order_by(FeaturedOffer.created_at.desc()).all()
    return jsonify([o.to_dict() for o in offers]), 200


# ── Admin: list ALL offers ────────────────────────────────────────────────────
@featured_offers_bp.route('/', methods=['GET'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def list_offers(current_user):
    offers = FeaturedOffer.query.order_by(FeaturedOffer.created_at.desc()).all()
    return jsonify([o.to_dict() for o in offers]), 200


# ── Admin: create offer ───────────────────────────────────────────────────────
@featured_offers_bp.route('/', methods=['POST'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def create_offer(current_user):
    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    is_active = request.form.get('is_active', 'true').lower() in ('true', '1', 'yes')

    if not title:
        return jsonify({'message': 'Title is required'}), 400

    image_url = ''
    file = request.files.get('image')
    if file and _allowed_file(file.filename):
        filename = _crop_and_save(file)
        image_url = _build_image_url(filename)
    elif request.form.get('image_url'):
        image_url = request.form.get('image_url')
    else:
        return jsonify({'message': 'An image file is required'}), 400

    offer = FeaturedOffer(title=title, description=description, image_url=image_url, is_active=is_active)
    db.session.add(offer)
    db.session.commit()
    return jsonify({'message': 'Offer created', 'offer': offer.to_dict()}), 201


# ── Admin: update offer ───────────────────────────────────────────────────────
@featured_offers_bp.route('/<int:offer_id>', methods=['PUT'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def update_offer(current_user, offer_id):
    offer = FeaturedOffer.query.get_or_404(offer_id)

    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    is_active_raw = request.form.get('is_active')

    if title:
        offer.title = title
    if description is not None:
        offer.description = description
    if is_active_raw is not None:
        offer.is_active = is_active_raw.lower() in ('true', '1', 'yes')

    file = request.files.get('image')
    if file and _allowed_file(file.filename):
        # Delete old file if it was one we uploaded
        if offer.image_url and offer.image_url.startswith('/api/featured_offers/uploads/'):
            old_filename = offer.image_url.split('/')[-1]
            old_path = os.path.join(UPLOAD_FOLDER, old_filename)
            if os.path.exists(old_path):
                os.remove(old_path)
        filename = _crop_and_save(file)
        offer.image_url = _build_image_url(filename)

    db.session.commit()
    return jsonify({'message': 'Offer updated', 'offer': offer.to_dict()}), 200


# ── Admin: toggle active ──────────────────────────────────────────────────────
@featured_offers_bp.route('/<int:offer_id>/toggle', methods=['PATCH'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def toggle_offer(current_user, offer_id):
    offer = FeaturedOffer.query.get_or_404(offer_id)
    offer.is_active = not offer.is_active
    db.session.commit()
    return jsonify({'message': 'Status toggled', 'is_active': offer.is_active}), 200


# ── Admin: delete offer ───────────────────────────────────────────────────────
@featured_offers_bp.route('/<int:offer_id>', methods=['DELETE'])
@role_required(['Super_admin', 'management', 'shop_manager'])
def delete_offer(current_user, offer_id):
    offer = FeaturedOffer.query.get_or_404(offer_id)
    if offer.image_url and offer.image_url.startswith('/api/featured_offers/uploads/'):
        old_filename = offer.image_url.split('/')[-1]
        old_path = os.path.join(UPLOAD_FOLDER, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
    db.session.delete(offer)
    db.session.commit()
    return jsonify({'message': 'Offer deleted'}), 200
