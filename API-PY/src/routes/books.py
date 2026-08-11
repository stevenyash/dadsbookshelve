from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from datetime import datetime
from src.middleware.auth import require_auth, require_admin
from src.models import db, Books, Genres, Inventory, Librarybooks, Membership, UserCustomPermissions

books_bp = Blueprint('books', __name__)


@books_bp.route('', methods=['GET'])
@books_bp.route('/', methods=['GET'])
@books_bp.route('/index', methods=['GET'])
def index():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    search = request.args.get('search', '')
    genre_id = request.args.get('genre_id', type=int)
    isbn = request.args.get('isbn', '')
    
    query = Books.query.filter(Books.deleted == None)
    
    if search:
        query = query.filter(Books.title.ilike(f'%{search}%'))
    
    if genre_id:
        query = query.filter(Books.genre_id == genre_id)
    
    if isbn:
        query = query.filter(Books.isbn == isbn)
    
    total = query.count()
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    books = query.offset((page - 1) * limit).limit(limit).all()
    
    return jsonify({
        'success': True,
        'records': [b.to_dict() for b in books],
        'total': total,
        'page': page,
        'limit': limit,
        'totalPages': total_pages
    })


@books_bp.route('/library', methods=['GET'])
def library():
    """Get library books (only available ones)"""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 12, type=int)
    genre_id = request.args.get('genre_id', type=int)
    
    query = Books.query.filter(
        Books.deleted == None,
        Books.available > 0
    )
    
    if genre_id:
        query = query.filter(Books.genre_id == genre_id)
    
    total = query.count()
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    books = query.offset((page - 1) * limit).limit(limit).all()
    
    return jsonify({
        'success': True,
        'records': [b.to_dict() for b in books],
        'total': total,
        'page': page,
        'limit': limit,
        'totalPages': total_pages
    })


@books_bp.route('/view/<int:book_id>', methods=['GET'])
def view(book_id):
    book = Books.query.get(book_id)
    if not book:
        return jsonify({'success': False, 'error': 'Book not found'}), 404
    
    # Include library book data if available
    book_dict = book.to_dict()
    library_book = Librarybooks.query.filter_by(book_id=book_id).first()
    if library_book:
        book_dict['librarybooks'] = {
            'soft_copy': library_book.soft_copy,
            'distribution_format': library_book.distribution_format,
            'readium_manifest': library_book.readium_manifest,
            'book_key': library_book.book_key,
            'book_keysignature': library_book.book_keysignature,
        }
    
    return jsonify({
        'success': True,
        'record': book_dict
    })


@books_bp.route('/verify-access/<int:book_id>', methods=['GET'])
def verify_access(book_id):
    """Verify if user has access to read a library book"""
    user_id = request.args.get('userId', type=int)
    
    if not user_id:
        return jsonify({
            'success': False,
            'canAccess': False,
            'reason': 'not_authenticated',
            'message': 'User ID is required'
        }), 400
    
    # Check if book exists and has a soft copy
    book = Books.query.get(book_id)
    if not book:
        return jsonify({
            'success': False,
            'canAccess': False,
            'reason': 'book_not_found',
            'message': 'Book not found'
        }), 404
    
    library_book = Librarybooks.query.filter_by(book_id=book_id).first()
    
    # Debug: log what's happening
    debug_info = {
        'book_available_field': book.available if book else None,
        'library_book_exists': library_book is not None,
        'has_soft_copy': bool(library_book.soft_copy) if library_book else False
    }
    print(f"DEBUG verify-access book_id={book_id}: {debug_info}")
    
    # Check if book is available for library (available field has bitmask: 1=shop, 2=library, 3=both)
    # OR if it has a soft copy in librarybooks table
    book_available_in_library = book and ((book.available & 2) == 2 or (library_book and library_book.soft_copy))
    
    print(f"DEBUG book_available_in_library: {book_available_in_library}")
    
    if not book_available_in_library:
        return jsonify({
            'success': True,
            'canAccess': False,
            'reason': 'not_available',
            'message': 'This book is not available for reading',
            'debug': debug_info
        })
    
    # Check if user has an active membership
    membership = Membership.query.filter(
        Membership.user_id == user_id,
        Membership.membership_status == 'active'
    ).first()
    
    print(f"DEBUG membership for user_id={user_id}: {membership}")
    
    if membership:
        # Check if membership is expired
        if membership.subscription_expiry and membership.subscription_expiry.strftime('%Y-%m-%d') < datetime.utcnow().strftime('%Y-%m-%d'):
            membership = None
            print(f"DEBUG membership expired")
    
    if membership:
        return jsonify({
            'success': True,
            'canAccess': True,
            'accessType': 'subscription',
            'expiresAt': membership.subscription_expiry.isoformat() if membership.subscription_expiry else None
        })
    
    # Check if user bought the book (check in orders or payments)
    # For now, return no access
    return jsonify({
        'success': True,
        'canAccess': False,
        'reason': 'no_subscription',
        'message': 'Please subscribe to access the library',
        'debug': {'membership_found': membership is not None}
    })


@books_bp.route('/add', methods=['POST'])
@require_auth
def add():
    data = request.get_json()
    
    book = Books(
        title=data.get('title'),
        author=data.get('author'),
        genre_id=data.get('genre_id'),
        isbn=data.get('isbn'),
        price=data.get('price'),
        price_digital=data.get('price_digital'),
        price_physical=data.get('price_physical'),
        stock=data.get('stock', 0),
        stock_digital=data.get('stock_digital', 999),
        stock_physical=data.get('stock_physical', 0),
        published_date=data.get('published_date'),
        image_url=data.get('image_url'),
        overview=data.get('overview'),
        available=data.get('available', 3)
    )
    
    db.session.add(book)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': book.to_dict(),
        'message': 'Book added successfully'
    })


@books_bp.route('/edit/<int:book_id>', methods=['PUT'])
@require_auth
def edit(book_id):
    book = Books.query.get(book_id)
    if not book:
        return jsonify({'success': False, 'error': 'Book not found'}), 404
    
    data = request.get_json()
    
    if 'title' in data:
        book.title = data['title']
    if 'author' in data:
        book.author = data['author']
    if 'genre_id' in data:
        book.genre_id = data['genre_id']
    if 'price' in data:
        book.price = data['price']
    if 'price_digital' in data:
        book.price_digital = data['price_digital']
    if 'price_physical' in data:
        book.price_physical = data['price_physical']
    if 'stock' in data:
        book.stock = data['stock']
    if 'image_url' in data:
        book.image_url = data['image_url']
    if 'overview' in data:
        book.overview = data['overview']
    if 'available' in data:
        book.available = data['available']
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': book.to_dict(),
        'message': 'Book updated successfully'
    })


@books_bp.route('/toggle-availability/<int:book_id>', methods=['PATCH'])
@require_auth
def toggle_availability(book_id):
    """Toggle book availability (in_shop or in_library)"""
    book = Books.query.get(book_id)
    if not book:
        return jsonify({'success': False, 'error': 'Book not found'}), 404
    
    data = request.get_json() or {}
    in_shop = data.get('in_shop')
    in_library = data.get('in_library')
    
    if in_shop is not None:
        if in_shop:
            book.available = book.available | 1  # add shop bit
        else:
            book.available = book.available & ~1  # remove shop bit
    
    if in_library is not None:
        if in_library:
            book.available = book.available | 2  # add library bit
        else:
            book.available = book.available & ~2  # remove library bit
    
    # Ensure available is at least 1 if both unset
    if book.available == 0:
        book.available = 1
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': book.to_dict(),
        'message': 'Availability updated successfully'
    })


@books_bp.route('/delete/<int:book_id>', methods=['DELETE'])
@require_auth
def delete(book_id):
    from src.models import Librarybooks, OrderItems, CartItems, Reviews, Inventory, Readinghistory, SalesReports, AffiliateLinks, BookPurchases, AuthorTransactions, Borrowtransactions, FeaturedBooks
    import os
    from flask import current_app
    
    book = Books.query.get(book_id)
    if not book:
        return jsonify({'success': False, 'error': 'Book not found'}), 404
    
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    
    if book.image_url:
        try:
            image_path = book.image_url.replace('/uploads/', '').replace('/', os.sep)
            full_path = os.path.join(upload_folder, image_path)
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception:
            pass
    
    library_book = Librarybooks.query.filter_by(book_id=str(book_id)).first()
    if library_book and library_book.soft_copy:
        try:
            soft_path = library_book.soft_copy.replace('/uploads/', '').replace('/', os.sep)
            full_path = os.path.join(upload_folder, soft_path)
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception:
            pass
        db.session.delete(library_book)
    
    OrderItems.query.filter_by(book_id=book_id).delete()
    CartItems.query.filter_by(book_id=book_id).delete()
    Reviews.query.filter_by(book_id=book_id).delete()
    Inventory.query.filter_by(book_id=book_id).delete()
    Readinghistory.query.filter_by(book_id=book_id).delete()
    SalesReports.query.filter_by(book_id=book_id).delete()
    AffiliateLinks.query.filter_by(book_id=book_id).delete()
    BookPurchases.query.filter_by(book_id=book_id).delete()
    AuthorTransactions.query.filter_by(book_id=book_id).delete()
    Borrowtransactions.query.filter_by(book_id=book_id).delete()
    FeaturedBooks.query.filter_by(book_id=book_id).delete()
    
    book.deleted = db.func.current_timestamp()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Book deleted successfully'
    })


@books_bp.route('/shop', methods=['GET'])
def shop():
    """Public shop endpoint - returns available books"""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    search = request.args.get('search', '', type=str).strip()
    genre_id = request.args.get('genre_id', None, type=int)
    
    query = Books.query.filter(
        Books.deleted == None,
        Books.available.in_([1, 3])  # shop or both
    )
    
    if search:
        search_term = f'%{search}%'
        query = query.filter(
            db.or_(
                Books.title.ilike(search_term),
                Books.author.ilike(search_term)
            )
        )
    
    if genre_id:
        query = query.filter(Books.genre_id == genre_id)
    
    total = query.count()
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    
    books = query.order_by(Books.book_id.desc()).offset((page - 1) * limit).limit(limit).all()
    
    return jsonify({
        'success': True,
        'records': [b.to_dict() for b in books],
        'page': page,
        'limit': limit,
        'total': total,
        'totalPages': total_pages
    })
