from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from decimal import Decimal
from datetime import datetime
from src.middleware.auth import require_auth
from src.models import db, Orders, OrderItems, Books, CartItems, BookPurchases

orders_bp = Blueprint('orders', __name__)


@orders_bp.route('/index', methods=['GET'])
@require_auth
def index():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    status = request.args.get('status')
    
    query = Orders.query.filter(Orders.user_id == user_id)
    
    if status:
        query = query.filter(Orders.status == status)
    
    total = query.count()
    orders = query.order_by(Orders.order_date.desc()).offset((page - 1) * limit).limit(limit).all()
    
    return jsonify({
        'success': True,
        'records': [o.to_dict() for o in orders],
        'total': total,
        'page': page,
        'limit': limit
    })


@orders_bp.route('/view/<int:order_id>', methods=['GET'])
@require_auth
def view(order_id):
    order = Orders.query.get(order_id)
    if not order:
        return jsonify({'success': False, 'error': 'Order not found'}), 404
    
    return jsonify({
        'success': True,
        'record': order.to_dict(),
        'items': [item.to_dict() for item in order.order_items]
    })


@orders_bp.route('/add', methods=['POST'])
@require_auth
def add():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    items_data = data.get('items', [])
    if not items_data:
        return jsonify({'success': False, 'error': 'No items provided'}), 400
    
    total_amount = Decimal('0')
    order_items = []
    
    for item in items_data:
        book = Books.query.get(item['book_id'])
        if not book:
            continue
        
        quantity = item.get('quantity', 1)
        price = item.get('price', book.price)
        item_total = price * quantity
        total_amount += item_total
        
        order_items.append({
            'book_id': book.book_id,
            'quantity': quantity,
            'price': price,
            'total_price': item_total,
            'order_type': item.get('copy_type', 'digital')
        })
    
    order = Orders(
        user_id=user_id,
        total_amount=total_amount,
        status='pending'
    )
    
    db.session.add(order)
    db.session.flush()
    
    for item_data in order_items:
        item = OrderItems(
            order_id=order.order_id,
            book_id=item_data['book_id'],
            quantity=item_data['quantity'],
            price=item_data['price'],
            total_price=item_data['total_price'],
            order_type=item_data['order_type']
        )
        db.session.add(item)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': order.to_dict(),
        'message': 'Order created successfully'
    })


@orders_bp.route('/edit/<int:order_id>', methods=['PUT'])
@require_auth
def edit(order_id):
    order = Orders.query.get(order_id)
    if not order:
        return jsonify({'success': False, 'error': 'Order not found'}), 404
    
    data = request.get_json()
    
    if 'status' in data:
        order.status = data['status']
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': order.to_dict(),
        'message': 'Order updated successfully'
    })


@orders_bp.route('/delete/<int:order_id>', methods=['DELETE'])
@require_auth
def delete(order_id):
    order = Orders.query.get(order_id)
    if not order:
        return jsonify({'success': False, 'error': 'Order not found'}), 404
    
    order.status = 'cancelled'
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Order cancelled successfully'
    })


@orders_bp.route('/create-from-cart', methods=['POST'])
@require_auth
def create_from_cart():
    user_id = get_jwt_identity()
    
    cart_items = CartItems.query.filter_by(client_id=user_id).all()
    if not cart_items:
        return jsonify({'success': False, 'error': 'Cart is empty'}), 400
    
    total_amount = sum(item.price * item.quantity for item in cart_items)
    
    order = Orders(
        user_id=user_id,
        total_amount=total_amount,
        status='pending'
    )
    
    db.session.add(order)
    db.session.flush()
    
    for cart_item in cart_items:
        order_item = OrderItems(
            order_id=order.order_id,
            book_id=cart_item.book_id,
            quantity=cart_item.quantity,
            price=cart_item.price,
            total_price=cart_item.price * cart_item.quantity,
            order_type=cart_item.copy_type
        )
        db.session.add(order_item)
    
    CartItems.query.filter_by(client_id=user_id).delete()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': order.to_dict(),
        'message': 'Order created from cart'
    })


@orders_bp.route('/my-purchases', methods=['GET'])
@require_auth
def my_purchases():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    
    query = BookPurchases.query.filter_by(user_id=user_id)
    
    total = query.count()
    purchases = query.order_by(BookPurchases.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    return jsonify({
        'success': True,
        'records': [{
            'id': p.id,
            'book_id': p.book_id,
            'book_format': p.book_format,
            'status': p.status,
            'created_at': p.created_at.isoformat() if p.created_at else None,
            'book': Books.query.get(p.book_id).to_dict() if Books.query.get(p.book_id) else None
        } for p in purchases],
        'total': total,
        'page': page,
        'limit': limit
    })
