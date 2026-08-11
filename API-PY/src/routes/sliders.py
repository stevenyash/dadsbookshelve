from flask import Blueprint, request, jsonify
from src.middleware.auth import require_auth, require_admin
from src.models import db, Sliders, CurrentSliders

sliders_bp = Blueprint('sliders', __name__)


@sliders_bp.route('', methods=['GET'])
@sliders_bp.route('/', methods=['GET'])
@sliders_bp.route('/index', methods=['GET'])
def index():
    """Public: list all active sliders (for frontend)"""
    limit = request.args.get('limit', 10, type=int)
    sliders = Sliders.query.limit(limit).all()
    return jsonify({
        'success': True,
        'records': [{'id': s.id, 'sliders_image_url': s.image_url, 'image_url': s.image_url, 'title': s.title, 'description': s.description, 'button_label': s.button_label, 'button_action': s.button_action} for s in sliders]
    })


@sliders_bp.route('/view/<int:slider_id>', methods=['GET'])
def view(slider_id):
    """Public: view single slider"""
    slider = Sliders.query.get(slider_id)
    if not slider:
        return jsonify({'success': False, 'error': 'Slider not found'}), 404
    return jsonify({'success': True, 'record': {'id': slider.id, 'image_url': slider.image_url, 'title': slider.title, 'description': slider.description}})


@sliders_bp.route('', methods=['POST'])
def add():
    """Admin: create new slider"""
    try:
        data = request.get_json()
        slider = Sliders(
            image_url=data.get('image_url'),
            title=data.get('title'),
            description=data.get('description'),
            button_label=data.get('button_label'),
            button_action=data.get('button_action')
        )
        db.session.add(slider)
        db.session.commit()
        return jsonify({'success': True, 'record': {'id': slider.id}}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@sliders_bp.route('/edit/<int:slider_id>', methods=['PUT'])
def edit(slider_id):
    """Admin: update slider"""
    try:
        slider = Sliders.query.get(slider_id)
        if not slider:
            return jsonify({'success': False, 'error': 'Slider not found'}), 404
        data = request.get_json()
        for key in ['image_url', 'title', 'description', 'button_label', 'button_action']:
            if key in data:
                setattr(slider, key, data[key])
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@sliders_bp.route('/delete/<int:slider_id>', methods=['DELETE'])
def delete(slider_id):
    """Admin: delete slider"""
    try:
        slider = Sliders.query.get(slider_id)
        if not slider:
            return jsonify({'success': False, 'error': 'Slider not found'}), 404
        db.session.delete(slider)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# Current Sliders Management (admin only)
currentsliders_bp = Blueprint('currentsliders', __name__)


@currentsliders_bp.route('/index', methods=['GET'])
def index():
    """Public: get current active sliders order"""
    sliders = CurrentSliders.query.order_by(CurrentSliders.position).all()
    return jsonify({
        'success': True,
        'records': [{'id': s.id, 'slider_id': s.slider_id, 'position': s.position} for s in sliders]
    })


@currentsliders_bp.route('', methods=['POST'])
@currentsliders_bp.route('/add', methods=['POST'])
def add():
    """Admin: add slider to homepage rotation"""
    try:
        data = request.get_json()
        slider = CurrentSliders(
            slider_id=data.get('slider_id'),
            position=data.get('position', 0)
        )
        db.session.add(slider)
        db.session.commit()
        return jsonify({'success': True, 'record': {'id': slider.id}}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@currentsliders_bp.route('/edit/<int:id>', methods=['PUT'])
def edit(id):
    """Admin: update slider position/order"""
    try:
        slider = CurrentSliders.query.get(id)
        if not slider:
            return jsonify({'success': False, 'error': 'Slider not found'}), 404
        data = request.get_json()
        if 'slider_id' in data:
            slider.slider_id = data['slider_id']
        if 'position' in data:
            slider.position = data['position']
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@currentsliders_bp.route('/delete/<int:id>', methods=['DELETE'])
def delete(id):
    """Admin: remove slider from homepage rotation"""
    try:
        slider = CurrentSliders.query.get(id)
        if not slider:
            return jsonify({'success': False, 'error': 'Slider not found'}), 404
        db.session.delete(slider)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
