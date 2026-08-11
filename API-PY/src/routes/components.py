from flask import Blueprint, request, jsonify
from src.models import db, Settings
from datetime import datetime, timedelta

components_bp = Blueprint('components', __name__)

@components_bp.route('/test-db', methods=['GET'])
def test_db():
    try:
        from src.models import Libraryaccess
        count = Libraryaccess.query.count()
        return jsonify({'success': True, 'count': count})
    except Exception as e:
        import traceback
        return jsonify({'success': False, 'error': str(e), 'trace': traceback.format_exc()}), 500

@components_bp.route('/components_data/featuredbooks', methods=['GET'])
def get_featured_books():
    try:
        result = db.session.execute(db.text('''
            SELECT fb.id, fb.book_id, fb.position, fb.status,
                   b.title, b.image_url, b.price, b.author
            FROM featured_books fb
            LEFT JOIN books b ON fb.book_id = b.book_id
            WHERE b.title IS NOT NULL
            ORDER BY fb.position DESC, fb.id DESC
            LIMIT 1
        '''))
        
        books = []
        for row in result:
            if row.book_id and row.title:
                books.append({
                    'book_id': row.book_id,
                    'books_title': row.title,
                    'books_image_url': row.image_url,
                    'books_price': float(row.price) if row.price else 0,
                    'author': row.author,
                })
        
        return jsonify({'success': True, 'records': books, 'totalRecords': len(books)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@components_bp.route('/components_data/daystory', methods=['GET'])
def get_day_story():
    try:
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        result = db.session.execute(db.text('''
            SELECT * FROM stories 
            WHERE date_to_show >= :today AND date_to_show < :tomorrow
            LIMIT 1
        '''), {'today': today, 'tomorrow': tomorrow})
        
        story = result.fetchone()
        
        if not story:
            result = db.session.execute(db.text('''
                SELECT * FROM stories ORDER BY date_created DESC LIMIT 1
            '''))
            story = result.fetchone()
        
        if not story:
            return jsonify({'success': True, 'title': 'Story of the Day', 'topic': '', 'content': ''})
        
        return jsonify({
            'success': True,
            'title': 'Story of the Day',
            'topic': story.topic,
            'content': story.content,
            'image_url': story.image_url,
            'date': story.date_created,
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@components_bp.route('/components_data/currentsliders', methods=['GET'])
def get_current_sliders():
    try:
        limit = request.args.get('limit', 10, type=int)
        
        result = db.session.execute(db.text('''
            SELECT id, slider_id, position, date_created 
            FROM current_sliders 
            ORDER BY position ASC, id ASC 
            LIMIT :limit
        '''), {'limit': limit})
        
        records = []
        for row in result:
            records.append({
                'id': row.id,
                'slider_id': row.slider_id,
                'position': row.position,
                'date_created': row.date_created.isoformat() if row.date_created else None,
            })
        
        return jsonify({'success': True, 'records': records, 'totalRecords': len(records)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@components_bp.route('/components_data/all', methods=['GET'])
def get_all_components():
    try:
        sliders_result = db.session.execute(db.text('''
            SELECT id, slider_id, position FROM current_sliders ORDER BY position ASC, id ASC LIMIT 10
        '''))
        
        featured_result = db.session.execute(db.text('''
            SELECT fb.id, fb.book_id, fb.position, b.title, b.image_url, b.price, b.author
            FROM featured_books fb
            LEFT JOIN books b ON fb.book_id = b.book_id
            WHERE b.title IS NOT NULL
            ORDER BY fb.position DESC, fb.id DESC
            LIMIT 10
        '''))
        
        story_result = db.session.execute(db.text('''
            SELECT * FROM stories ORDER BY date_created DESC LIMIT 1
        '''))
        
        genres_result = db.session.execute(db.text('''
            SELECT genre_id, genre_name FROM genres WHERE genre_name != '' LIMIT 20
        '''))
        
        sliders = []
        for row in sliders_result:
            sliders.append({
                'id': row.id,
                'slider_id': row.slider_id,
                'position': row.position,
            })
        
        featured_books = []
        for row in featured_result:
            if row.book_id and row.title:
                featured_books.append({
                    'book_id': row.book_id,
                    'books_title': row.title,
                    'books_image_url': row.image_url,
                    'books_price': row.price,
                    'author': row.author,
                })
        
        story = story_result.fetchone()
        day_story = None
        if story:
            day_story = {
                'title': 'Story of the Day',
                'topic': story.topic,
                'content': story.content,
            }
        
        genres = []
        for row in genres_result:
            genres.append({
                'genre_id': row.genre_id,
                'genre_name': row.genre_name,
            })
        
        return jsonify({
            'success': True,
            'sliders': sliders,
            'featuredBooks': featured_books,
            'dayStory': day_story,
            'genres': genres,
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@components_bp.route('/components_data/libraryaccess', methods=['GET'])
def get_library_access():
    try:
        result = db.session.execute(db.text("SELECT access_id, access_type, is_member, amount_kenya_shillings, amount_usd, amount_eur, duration, allowed_devices FROM libraryaccess ORDER BY amount_kenya_shillings ASC"))
        records = []
        for row in result:
            records.append({
                'access_id': row[0],
                'access_type': row[1],
                'is_member': bool(row[2]) if row[2] is not None else None,
                'amount_kenya_shillings': float(row[3]) if row[3] else 0,
                'amount_usd': float(row[4]) if row[4] else 0,
                'amount_eur': float(row[5]) if row[5] else 0,
                'duration': row[6],
                'allowed_devices': row[7],
            })
        return jsonify({'success': True, 'records': records, 'totalRecords': len(records)})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@components_bp.route('/components_data/ebookpricing', methods=['GET'])
def get_ebook_pricing():
    try:
        from src.models import EbookPricing
        pricing = EbookPricing.query.all()
        records = []
        for p in pricing:
            records.append({
                'ebook_pricing_id': p.ebook_pricing_id,
                'pages_from': p.pages_from,
                'pages_to': p.pages_to,
                'price_kenya_shillings': p.price_kenya_shillings,
                'price_usd': p.price_usd,
            })
        return jsonify({'success': True, 'records': records, 'totalRecords': len(records)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@components_bp.route('/ebookpricing', methods=['GET'])
def get_ebook_pricing_simple():
    """Simple endpoint that returns pricing as flat object for frontend compatibility"""
    try:
        from src.models import EbookPricing
        pricing = EbookPricing.query.all()
        
        # Return in format expected by frontend: { KES: '...', USD: '...', EUR: '...' }
        # Use the middle tier pricing or first record
        if pricing:
            # Get middle range pricing
            mid = len(pricing) // 2
            p = pricing[mid] if mid < len(pricing) else pricing[0]
            return jsonify({
                'KES': str(int(p.price_kenya_shillings)) if p.price_kenya_shillings else '500',
                'USD': str(p.price_usd) if p.price_usd else '5',
                'EUR': '4'  # Default
            })
        return jsonify({'KES': '500', 'USD': '5', 'EUR': '4'})
    except Exception as e:
        return jsonify({'KES': '500', 'USD': '5', 'EUR': '4'})


@components_bp.route('/components_data/publisher-agreement', methods=['GET'])
def get_publisher_agreement():
    settings = Settings.query.first()
    if not settings:
        return jsonify({'success': True, 'record': {}})
    return jsonify(settings.publisher_agreement or '')


@components_bp.route('/components_data/publisher-declaration', methods=['GET'])
def get_publisher_declaration():
    settings = Settings.query.first()
    if not settings:
        return jsonify({'success': True, 'record': {}})
    return jsonify(settings.publisher_declaration or '')