from flask import Blueprint, request, jsonify
from src.models import db, FeaturedBooks, Books

book_of_day_admin_bp = Blueprint('book_of_day_admin', __name__)


@book_of_day_admin_bp.route('/featured-books', methods=['GET'])
def index_all():
    """Admin: list all featured book entries (any status)"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        status = request.args.get('status')  # Optional filter
        
        query = FeaturedBooks.query
        if status:
            query = query.filter_by(status=status)
        
        total = query.count()
        entries = query.order_by(FeaturedBooks.position.asc(), FeaturedBooks.date_created.desc()) \
                      .offset((page - 1) * limit) \
                      .limit(limit) \
                      .all()
        
        result = []
        for entry in entries:
            book = Books.query.get(entry.book_id) if entry.book_id else None
            result.append({
                'id': entry.id,
                'book_id': entry.book_id,
                'book_title': book.title if book else 'Unknown',
                'book_author': book.author if book else None,
                'book_image': book.image_url if book else None,
                'position': entry.position,
                'status': entry.status,
                'created_at': entry.date_created.isoformat() if entry.date_created else None,
            })
        
        return jsonify({
            'success': True,
            'records': result,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@book_of_day_admin_bp.route('/featured-books/<int:entry_id>', methods=['GET'])
def view(entry_id):
    """Admin: get single entry with details"""
    entry = FeaturedBooks.query.get(entry_id)
    if not entry:
        return jsonify({'success': False, 'error': 'Entry not found'}), 404
    
    book = Books.query.get(entry.book_id) if entry.book_id else None
    
    return jsonify({'success': True, 'record': {
        'id': entry.id,
        'book_id': entry.book_id,
        'book': {'book_id': book.book_id, 'title': book.title, 'author': book.author} if book else None,
        'position': entry.position,
        'status': entry.status,
        'created_at': entry.date_created.isoformat() if entry.date_created else None,
    }})
