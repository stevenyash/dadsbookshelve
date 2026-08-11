from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth, require_admin
from src.models import db, Carousel

carousel_admin_bp = Blueprint('carousel_admin', __name__)


@carousel_admin_bp.route('/carousel', methods=['GET'])
@require_auth
@require_admin
def index():
    """List all carousel items"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        active_only = request.args.get('active_only', type=bool, default=False)
        
        query = Carousel.query
        
        if active_only:
            query = query.filter_by(is_active=True)
        
        total = query.count()
        items = query.order_by(Carousel.order_index, Carousel.created_at.desc()) \
                    .offset((page - 1) * limit) \
                    .limit(limit) \
                    .all()
        
        return jsonify({
            'success': True,
            'records': [item.to_dict() for item in items],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@carousel_admin_bp.route('/carousel/<int:carousel_id>', methods=['GET'])
@require_auth
@require_admin
def view(carousel_id):
    """Get single carousel item"""
    item = Carousel.query.get(carousel_id)
    if not item:
        return jsonify({'success': False, 'error': 'Carousel item not found'}), 404
    
    return jsonify({'success': True, 'record': item.to_dict()})


@carousel_admin_bp.route('/carousel', methods=['POST'])
@require_auth
@require_admin
def create():
    """Create new carousel item"""
    try:
        data = request.get_json()
        
        if not data.get('title') or not data.get('image_url'):
            return jsonify({'success': False, 'error': 'Title and image_url are required'}), 400
        
        user_id = get_jwt_identity()
        
        item = Carousel(
            title=data['title'],
            description=data.get('description'),
            image_url=data['image_url'],
            link_url=data.get('link_url'),
            button_text=data.get('button_text'),
            order_index=data.get('order_index', 0),
            is_active=data.get('is_active', True),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            created_by=user_id
        )
        
        db.session.add(item)
        db.session.commit()
        
        return jsonify({'success': True, 'record': item.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@carousel_admin_bp.route('/carousel/<int:carousel_id>', methods=['PUT'])
@require_auth
@require_admin
def update(carousel_id):
    """Update carousel item"""
    try:
        item = Carousel.query.get(carousel_id)
        if not item:
            return jsonify({'success': False, 'error': 'Carousel item not found'}), 404
        
        data = request.get_json()
        
        for field in ['title', 'description', 'image_url', 'link_url', 'button_text', 'order_index', 'is_active', 'start_date', 'end_date']:
            if field in data:
                setattr(item, field, data[field])
        
        db.session.commit()
        
        return jsonify({'success': True, 'record': item.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@carousel_admin_bp.route('/carousel/<int:carousel_id>', methods=['DELETE'])
@require_auth
@require_admin
def delete(carousel_id):
    """Delete carousel item"""
    try:
        item = Carousel.query.get(carousel_id)
        if not item:
            return jsonify({'success': False, 'error': 'Carousel item not found'}), 404
        
        db.session.delete(item)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Carousel item deleted'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@carousel_admin_bp.route('/carousel/reorder', methods=['POST'])
@require_auth
@require_admin
def reorder():
    """Update order of multiple carousel items"""
    try:
        data = request.get_json()
        orders = data.get('orders', [])  # List of {id: int, order_index: int}
        
        for order_data in orders:
            item_id = order_data.get('id')
            new_index = order_data.get('order_index')
            if item_id is not None and new_index is not None:
                item = Carousel.query.get(item_id)
                if item:
                    item.order_index = new_index
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Order updated'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
