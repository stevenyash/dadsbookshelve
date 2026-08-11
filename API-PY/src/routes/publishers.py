from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth
from src.models import db, Publishers, PublisherPayments

publishers_bp = Blueprint('publishers', __name__)


@publishers_bp.route('/index', methods=['GET'])
def index():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    search = request.args.get('search', '')
    
    query = Publishers.query
    if search:
        query = query.filter(Publishers.name.ilike(f'%{search}%'))
    
    total = query.count()
    publishers = query.offset((page - 1) * limit).limit(limit).all()
    
    return jsonify({
        'success': True,
        'records': [{'publisher_id': p.publisher_id, 'name': p.name, 'email': p.email, 'phone': p.phone} for p in publishers],
        'total': total,
        'page': page,
        'limit': limit
    })


@publishers_bp.route('/view/<int:publisher_id>', methods=['GET'])
def view(publisher_id):
    publisher = Publishers.query.get(publisher_id)
    if not publisher:
        return jsonify({'success': False, 'error': 'Publisher not found'}), 404
    
    return jsonify({
        'success': True,
        'record': {'publisher_id': publisher.publisher_id, 'name': publisher.name, 'email': publisher.email, 'phone': publisher.phone, 'address': publisher.address}
    })


@publishers_bp.route('/add', methods=['POST'])
@require_auth
def add():
    data = request.get_json()
    
    publisher = Publishers(
        name=data.get('name'),
        email=data.get('email'),
        phone=data.get('phone'),
        address=data.get('address')
    )
    
    db.session.add(publisher)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': {'publisher_id': publisher.publisher_id},
        'message': 'Publisher added successfully'
    })


@publishers_bp.route('/edit/<int:publisher_id>', methods=['PUT'])
@require_auth
def edit(publisher_id):
    publisher = Publishers.query.get(publisher_id)
    if not publisher:
        return jsonify({'success': False, 'error': 'Publisher not found'}), 404
    
    data = request.get_json()
    for key in ['name', 'email', 'phone', 'address']:
        if key in data:
            setattr(publisher, key, data[key])
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Publisher updated successfully'
    })


@publishers_bp.route('/delete/<int:publisher_id>', methods=['DELETE'])
@require_auth
def delete(publisher_id):
    publisher = Publishers.query.get(publisher_id)
    if not publisher:
        return jsonify({'success': False, 'error': 'Publisher not found'}), 404
    
    db.session.delete(publisher)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Publisher deleted successfully'
    })


@publishers_bp.route('/payments/<int:publisher_id>', methods=['GET'])
@require_auth
def payments(publisher_id):
    payments = PublisherPayments.query.filter_by(publisher_id=publisher_id).order_by(PublisherPayments.created_at.desc()).all()
    
    return jsonify({
        'success': True,
        'records': [{'id': p.id, 'amount': p.amount, 'reference': p.reference, 'status': p.status, 'payment_date': p.payment_date} for p in payments]
    })
