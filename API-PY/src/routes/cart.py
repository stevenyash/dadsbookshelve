from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth
from src.models import db, CartItems, Clients

cartitems_bp = Blueprint('cartitems', __name__)


@cartitems_bp.route('/index', methods=['GET'])
@require_auth
def index():
    user_id = request.args.get('user_id', type=int) or get_jwt_identity()
    client = Clients.query.filter_by(user_id=user_id).first()
    if not client:
        return jsonify({'success': True, 'records': []})
    
    items = CartItems.query.filter_by(client_id=client.id).all()
    return jsonify({
        'success': True,
        'records': [{'id': i.id, 'book_id': i.book_id, 'quantity': i.quantity, 'copy_type': i.copy_type, 'price': float(i.price) if i.price else None} for i in items]
    })


@cartitems_bp.route('/add', methods=['POST'])
@require_auth
def add():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    client = Clients.query.filter_by(user_id=user_id).first()
    if not client:
        client = Clients(user_id=user_id, name=data.get('name'), email=data.get('email'))
        db.session.add(client)
        db.session.flush()
    
    item = CartItems(
        client_id=client.id,
        book_id=data.get('book_id'),
        quantity=data.get('quantity', 1),
        copy_type=data.get('copy_type', 'digital'),
        price=data.get('price')
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({'success': True, 'record': {'id': item.id}})


@cartitems_bp.route('/edit/<int:item_id>', methods=['PUT'])
def edit(item_id):
    item = CartItems.query.get(item_id)
    if not item:
        return jsonify({'success': False, 'error': 'Item not found'}), 404
    data = request.get_json()
    for key in ['quantity', 'copy_type', 'price']:
        if key in data:
            setattr(item, key, data[key])
    db.session.commit()
    return jsonify({'success': True})


@cartitems_bp.route('/delete/<int:item_id>', methods=['DELETE'])
def delete(item_id):
    item = CartItems.query.get(item_id)
    if not item:
        return jsonify({'success': False, 'error': 'Item not found'}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({'success': True})


@cartitems_bp.route('/clear', methods=['DELETE'])
@require_auth
def clear():
    user_id = get_jwt_identity()
    client = Clients.query.filter_by(user_id=user_id).first()
    if client:
        CartItems.query.filter_by(client_id=client.id).delete()
        db.session.commit()
    return jsonify({'success': True, 'message': 'Cart cleared'})
