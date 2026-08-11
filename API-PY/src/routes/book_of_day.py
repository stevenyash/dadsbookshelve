from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth, require_admin
from src.models import db, BookOfDay, Books

book_of_day_admin_bp = Blueprint('book_of_day_admin', __name__)


@book_of_day_admin_bp.route('/book-of-day', methods=['GET'])
@require_auth
@require_admin
def index():
    """List book of day entries"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        date_filter = request.args.get('date')  # Filter by specific date
        
        query = BookOfDay.query
        
        if date_filter:
            query = query.filter_by(featured_date=date_filter)
        
        total = query.count()
        items = query.order_by(BookOfDay.featured_date.desc(), BookOfDay.created_at.desc()) \
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


@book_of_day_admin_bp.route('/book-of-day/<int:entry_id>', methods=['GET'])
@require_auth
@require_admin
def view(entry_id):
    """Get single entry"""
    item = BookOfDay.query.get(entry_id)
    if not item:
        return jsonify({'success': False, 'error': 'Entry not found'}), 404
    
    return jsonify({'success': True, 'record': item.to_dict()})


@book_of_day_admin_bp.route('/book-of-day', methods=['POST'])
@require_auth
@require_admin
def create():
    """Create new book of day entry"""
    try:
        data = request.get_json()
        
        required_fields = ['book_id', 'featured_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        # Check if book exists
        book = Books.query.get(data['book_id'])
        if not book:
            return jsonify({'success': False, 'error': 'Book not found'}), 404
        
        # Check for duplicate entry for same date
        existing = BookOfDay.query.filter_by(
            book_id=data['book_id'],
            featured_date=data['featured_date']
        ).first()
        if existing:
            return jsonify({'success': False, 'error': 'This book is already featured on this date'}), 400
        
        item = BookOfDay(
            book_id=data['book_id'],
            featured_date=data['featured_date'],
            reason=data.get('reason'),
            is_active=data.get('is_active', True)
        )
        
        db.session.add(item)
        db.session.commit()
        
        return jsonify({'success': True, 'record': item.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@book_of_day_admin_bp.route('/book-of-day/<int:entry_id>', methods=['PUT'])
@require_auth
@require_admin
def update(entry_id):
    """Update book of day entry"""
    try:
        item = BookOfDay.query.get(entry_id)
        if not item:
            return jsonify({'success': False, 'error': 'Entry not found'}), 404
        
        data = request.get_json()
        
        # If changing book/date, check for duplicates
        if 'book_id' in data or 'featured_date' in data:
            new_book_id = data.get('book_id', item.book_id)
            new_date = data.get('featured_date', item.featured_date)
            
            existing = BookOfDay.query.filter_by(
                book_id=new_book_id,
                featured_date=new_date
            ).filter(BookOfDay.id != entry_id).first()
            
            if existing:
                return jsonify({'success': False, 'error': 'This book is already featured on this date'}), 400
        
        for field in ['book_id', 'featured_date', 'reason', 'is_active']:
            if field in data:
                setattr(item, field, data[field])
        
        db.session.commit()
        
        return jsonify({'success': True, 'record': item.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@book_of_day_admin_bp.route('/book-of-day/<int:entry_id>', methods=['DELETE'])
@require_auth
@require_admin
def delete(entry_id):
    """Delete book of day entry"""
    try:
        item = BookOfDay.query.get(entry_id)
        if not item:
            return jsonify({'success': False, 'error': 'Entry not found'}), 404
        
        db.session.delete(item)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Entry deleted'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
