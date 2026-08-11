from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth
from src.models import db, Authors, SalesBooks

authors_bp = Blueprint('authors', __name__)


@authors_bp.route('/index', methods=['GET'])
def index():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    search = request.args.get('search', '')
    
    query = Authors.query
    if search:
        query = query.filter(Authors.full_name.ilike(f'%{search}%'))
    
    total = query.count()
    authors = query.offset((page - 1) * limit).limit(limit).all()
    
    return jsonify({
        'success': True,
        'records': [{'author_id': a.author_id, 'full_name': a.full_name, 'email': a.email, 'phone_number': a.phone_number} for a in authors],
        'total': total,
        'page': page,
        'limit': limit
    })


@authors_bp.route('/view/<int:author_id>', methods=['GET'])
def view(author_id):
    author = Authors.query.get(author_id)
    if not author:
        return jsonify({'success': False, 'error': 'Author not found'}), 404
    
    return jsonify({
        'success': True,
        'record': {'author_id': author.author_id, 'full_name': author.full_name, 'email': author.email, 'phone_number': author.phone_number}
    })


@authors_bp.route('/add', methods=['POST'])
@require_auth
def add():
    data = request.get_json()
    
    existing = Authors.query.filter_by(email=data.get('email')).first()
    if existing:
        return jsonify({'success': False, 'error': 'Email already exists'}), 400
    
    author = Authors(
        full_name=data.get('full_name'),
        email=data.get('email'),
        phone_number=data.get('phone_number')
    )
    
    db.session.add(author)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': {'author_id': author.author_id},
        'message': 'Author added successfully'
    })


@authors_bp.route('/edit/<int:author_id>', methods=['PUT'])
@require_auth
def edit(author_id):
    author = Authors.query.get(author_id)
    if not author:
        return jsonify({'success': False, 'error': 'Author not found'}), 404
    
    data = request.get_json()
    for key in ['full_name', 'phone_number']:
        if key in data:
            setattr(author, key, data[key])
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Author updated successfully'
    })


@authors_bp.route('/delete/<int:author_id>', methods=['DELETE'])
@require_auth
def delete(author_id):
    author = Authors.query.get(author_id)
    if not author:
        return jsonify({'success': False, 'error': 'Author not found'}), 404
    
    db.session.delete(author)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Author deleted successfully'
    })
