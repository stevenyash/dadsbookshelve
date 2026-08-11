from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth, require_admin
from src.models import db, Stories, FeaturedBooks, Books

stories_bp = Blueprint('stories', __name__)


@stories_bp.route('/index', methods=['GET'])
def index():
    """Public: list published stories"""
    status = request.args.get('status', '1')
    stories = Stories.query.filter_by(status=status).order_by(Stories.date_created.desc()).all()
    return jsonify({
        'success': True,
        'records': [{'id': s.id, 'topic': s.topic, 'title': s.title, 'content': s.content, 'image_url': s.image_url, 'date_to_show': s.date_to_show.isoformat() if s.date_to_show else None} for s in stories]
    })


@stories_bp.route('/view/<int:story_id>', methods=['GET'])
def view(story_id):
    """Public: view single story"""
    story = Stories.query.get(story_id)
    if not story:
        return jsonify({'success': False, 'error': 'Story not found'}), 404
    return jsonify({'success': True, 'record': {'id': story.id, 'topic': story.topic, 'title': story.title, 'content': story.content}})


@stories_bp.route('/add', methods=['POST'])
@require_auth
@require_admin
def add():
    """Admin: create story/news"""
    try:
        data = request.get_json()
        story = Stories(
            topic=data.get('topic'),
            title=data.get('title'),
            content=data.get('content'),
            image_url=data.get('image_url'),
            date_to_show=data.get('date_to_show'),
            status=data.get('status', '1')
        )
        db.session.add(story)
        db.session.commit()
        return jsonify({'success': True, 'record': {'id': story.id}}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@stories_bp.route('/edit/<int:story_id>', methods=['PUT'])
@require_auth
@require_admin
def edit(story_id):
    """Admin: update story"""
    try:
        story = Stories.query.get(story_id)
        if not story:
            return jsonify({'success': False, 'error': 'Story not found'}), 404
        data = request.get_json()
        for key in ['topic', 'title', 'content', 'image_url', 'date_to_show', 'status']:
            if key in data:
                setattr(story, key, data[key])
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@stories_bp.route('/delete/<int:story_id>', methods=['DELETE'])
@require_auth
@require_admin
def delete(story_id):
    """Admin: delete story"""
    try:
        story = Stories.query.get(story_id)
        if not story:
            return jsonify({'success': False, 'error': 'Story not found'}), 404
        db.session.delete(story)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# Featured Books Management (Book of the Day) - Admin only
featuredbooks_bp = Blueprint('featuredbooks', __name__)


@featuredbooks_bp.route('/index', methods=['GET'])
def index():
    """Public: list active featured books"""
    status = request.args.get('status', 'active')
    featured = FeaturedBooks.query.filter_by(status=status).order_by(FeaturedBooks.position).all()
    records = []
    for f in featured:
        book = Books.query.get(f.book_id)
        if book:
            records.append({'id': f.id, 'book_id': f.book_id, 'book_title': book.title, 'book_image': book.image_url, 'position': f.position})
    return jsonify({'success': True, 'records': records})


@featuredbooks_bp.route('', methods=['POST'])
@featuredbooks_bp.route('/add', methods=['POST'])
def add():
    """Admin: add featured book (book of the day)"""
    try:
        data = request.get_json()
        
        if not data.get('book_id'):
            return jsonify({'success': False, 'error': 'book_id is required'}), 400
        
        # Check if book exists
        book = Books.query.get(data['book_id'])
        if not book:
            return jsonify({'success': False, 'error': 'Book not found'}), 404
        
        # Check for duplicate active entry for same book
        existing = FeaturedBooks.query.filter_by(
            book_id=data['book_id'],
            status='active'
        ).first()
        if existing:
            return jsonify({'success': False, 'error': 'This book is already featured'}), 400
        
        featured = FeaturedBooks(
            book_id=data['book_id'],
            status=data.get('status', 'active'),
            position=data.get('position', 0)
        )
        db.session.add(featured)
        db.session.commit()
        return jsonify({'success': True, 'record': {'id': featured.id}}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@featuredbooks_bp.route('/edit/<int:id>', methods=['PUT'])
def edit(id):
    """Admin: update featured book"""
    try:
        featured = FeaturedBooks.query.get(id)
        if not featured:
            return jsonify({'success': False, 'error': 'Featured book not found'}), 404
        data = request.get_json()
        
        # If changing book, check for duplicate active
        if 'book_id' in data and data['book_id'] != featured.book_id:
            existing = FeaturedBooks.query.filter_by(
                book_id=data['book_id'],
                status='active'
            ).filter(FeaturedBooks.id != id).first()
            if existing:
                return jsonify({'success': False, 'error': 'This book is already featured'}), 400
        
        for key in ['book_id', 'status', 'position']:
            if key in data:
                setattr(featured, key, data[key])
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@featuredbooks_bp.route('/delete/<int:id>', methods=['DELETE'])
def delete(id):
    """Admin: remove featured book"""
    try:
        featured = FeaturedBooks.query.get(id)
        if not featured:
            return jsonify({'success': False, 'error': 'Featured book not found'}), 404
        db.session.delete(featured)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
