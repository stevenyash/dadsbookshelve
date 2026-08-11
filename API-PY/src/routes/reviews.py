from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth
from src.models import db, Reviews, Books

reviews_bp = Blueprint('reviews', __name__)


@reviews_bp.route('/index', methods=['GET'])
def index():
    book_id = request.args.get('book_id', type=int)
    query = Reviews.query
    if book_id:
        query = query.filter_by(book_id=book_id)
    
    reviews = query.all()
    return jsonify({
        'success': True,
        'records': [{'rate_id': r.rate_id, 'book_id': r.book_id, 'rating': r.rating, 'user_id': r.user_id} for r in reviews]
    })


@reviews_bp.route('/add', methods=['POST'])
@require_auth
def add():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    review = Reviews(
        book_id=data.get('book_id'),
        user_id=user_id,
        rating=data.get('rating')
    )
    db.session.add(review)
    db.session.commit()
    return jsonify({'success': True, 'record': {'rate_id': review.rate_id}})


@reviews_bp.route('/delete/<int:rate_id>', methods=['DELETE'])
@require_auth
def delete(rate_id):
    review = Reviews.query.get(rate_id)
    if not review:
        return jsonify({'success': False, 'error': 'Review not found'}), 404
    db.session.delete(review)
    db.session.commit()
    return jsonify({'success': True})


# Inventory
from src.models import Inventory

inventory_bp = Blueprint('inventory', __name__)


@inventory_bp.route('/index', methods=['GET'])
def index():
    book_id = request.args.get('book_id', type=int)
    query = Inventory.query
    if book_id:
        query = query.filter_by(book_id=book_id)
    
    records = query.order_by(Inventory.date.desc()).all()
    return jsonify({
        'success': True,
        'records': [{'inventory_id': i.inventory_id, 'book_id': i.book_id, 'quantity_in': i.quantity_in, 'quantity_out': i.quantity_out, 'date': i.date.isoformat() if i.date else None} for i in records]
    })


@inventory_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    inv = Inventory(
        book_id=data.get('book_id'),
        quantity_in=data.get('quantity_in', 0),
        quantity_out=data.get('quantity_out', 0)
    )
    db.session.add(inv)
    db.session.commit()
    return jsonify({'success': True, 'record': {'inventory_id': inv.inventory_id}})


# Library Books
from src.models import Librarybooks

librarybooks_bp = Blueprint('librarybooks', __name__)


@librarybooks_bp.route('/index', methods=['GET'])
def index():
    books = Librarybooks.query.all()
    return jsonify({
        'success': True,
        'records': [{'id': b.id, 'book_id': b.book_id, 'soft_copy': b.soft_copy, 'distribution_format': b.distribution_format} for b in books]
    })


@librarybooks_bp.route('/view/<int:id>', methods=['GET'])
def view(id):
    book = Librarybooks.query.get(id)
    if not book:
        return jsonify({'success': False, 'error': 'Book not found'}), 404
    return jsonify({'success': True, 'record': {'id': book.id, 'book_id': book.book_id, 'soft_copy': book.soft_copy}})


@librarybooks_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    book = Librarybooks(
        book_id=data.get('book_id'),
        soft_copy=data.get('soft_copy'),
        distribution_format=data.get('distribution_format', 'digital_book')
    )
    db.session.add(book)
    db.session.commit()
    return jsonify({'success': True, 'record': {'id': book.id}})


@librarybooks_bp.route('/edit/<int:id>', methods=['PUT'])
def edit(id):
    book = Librarybooks.query.get(id)
    if not book:
        return jsonify({'success': False, 'error': 'Book not found'}), 404
    data = request.get_json()
    for key in ['book_id', 'soft_copy', 'distribution_format', 'readium_manifest', 'book_key', 'book_keysignature']:
        if key in data:
            setattr(book, key, data[key])
    db.session.commit()
    return jsonify({'success': True})
