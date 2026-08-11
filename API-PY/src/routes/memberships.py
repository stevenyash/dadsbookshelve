from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth
from src.models import db, Membership, Libraryaccess, Borrowtransactions

memberships_bp = Blueprint('memberships', __name__)


@memberships_bp.route('/index', methods=['GET'])
@require_auth
def index():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    status = request.args.get('status')
    
    query = Membership.query
    if status:
        query = query.filter(Membership.membership_status == status)
    
    total = query.count()
    memberships = query.offset((page - 1) * limit).limit(limit).all()
    
    return jsonify({
        'success': True,
        'records': [{'membership_id': m.membership_id, 'member_name': m.member_name, 'membership_status': m.membership_status, 'subscription_expiry': m.subscription_expiry.isoformat() if m.subscription_expiry else None} for m in memberships],
        'total': total,
        'page': page,
        'limit': limit
    })


@memberships_bp.route('/view/<int:membership_id>', methods=['GET'])
@require_auth
def view(membership_id):
    membership = Membership.query.get(membership_id)
    if not membership:
        return jsonify({'success': False, 'error': 'Membership not found'}), 404
    
    return jsonify({
        'success': True,
        'record': {'membership_id': membership.membership_id, 'member_name': membership.member_name, 'membership_status': membership.membership_status, 'subscription_type': membership.subscription_type, 'subscription_expiry': membership.subscription_expiry.isoformat() if membership.subscription_expiry else None}
    })


@memberships_bp.route('/add', methods=['POST'])
@require_auth
def add():
    data = request.get_json()
    user_id = get_jwt_identity()
    
    membership = Membership(
        member_name=data.get('member_name'),
        user_id=user_id,
        access_id=data.get('access_id'),
        subscription_type=data.get('subscription_type'),
        membership_status='pending'
    )
    
    db.session.add(membership)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': {'membership_id': membership.membership_id},
        'message': 'Membership created successfully'
    })


@memberships_bp.route('/edit/<int:membership_id>', methods=['PUT'])
@require_auth
def edit(membership_id):
    membership = Membership.query.get(membership_id)
    if not membership:
        return jsonify({'success': False, 'error': 'Membership not found'}), 404
    
    data = request.get_json()
    for key in ['member_name', 'subscription_type', 'membership_status']:
        if key in data:
            setattr(membership, key, data[key])
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Membership updated successfully'
    })


@memberships_bp.route('/my-membership', methods=['GET'])
@require_auth
def my_membership():
    user_id = get_jwt_identity()
    membership = Membership.query.filter_by(user_id=user_id).first()
    
    if not membership:
        return jsonify({'success': False, 'error': 'No membership found'}), 404
    
    return jsonify({
        'success': True,
        'record': {'membership_id': membership.membership_id, 'membership_status': membership.membership_status, 'subscription_expiry': membership.subscription_expiry.isoformat() if membership.subscription_expiry else None}
    })


# Library Access Plans
libraryaccess_bp = Blueprint('libraryaccess', __name__)


@libraryaccess_bp.route('/index', methods=['GET'])
def index():
    plans = Libraryaccess.query.all()
    return jsonify({
        'success': True,
        'records': [{'access_id': p.access_id, 'access_type': p.access_type, 'amount_kenya_shillings': float(p.amount_kenya_shillings) if p.amount_kenya_shillings else None, 'amount_usd': float(p.amount_usd) if p.amount_usd else None, 'duration': p.duration, 'allowed_devices': p.allowed_devices} for p in plans]
    })


@libraryaccess_bp.route('/view/<int:access_id>', methods=['GET'])
def view(access_id):
    plan = Libraryaccess.query.get(access_id)
    if not plan:
        return jsonify({'success': False, 'error': 'Plan not found'}), 404
    return jsonify({'success': True, 'record': {'access_id': plan.access_id, 'access_type': plan.access_type, 'amount_kenya_shillings': float(plan.amount_kenya_shillings)}})


@libraryaccess_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    plan = Libraryaccess(
        access_type=data.get('access_type'),
        is_member=data.get('is_member'),
        amount_kenya_shillings=data.get('amount_kenya_shillings'),
        amount_usd=data.get('amount_usd'),
        amount_eur=data.get('amount_eur'),
        duration=data.get('duration'),
        allowed_devices=data.get('allowed_devices', 1)
    )
    db.session.add(plan)
    db.session.commit()
    return jsonify({'success': True, 'record': {'access_id': plan.access_id}})


@libraryaccess_bp.route('/edit/<int:access_id>', methods=['PUT'])
def edit(access_id):
    plan = Libraryaccess.query.get(access_id)
    if not plan:
        return jsonify({'success': False, 'error': 'Plan not found'}), 404
    data = request.get_json()
    for key in ['access_type', 'is_member', 'amount_kenya_shillings', 'amount_usd', 'amount_eur', 'duration', 'allowed_devices']:
        if key in data:
            setattr(plan, key, data[key])
    db.session.commit()
    return jsonify({'success': True})


@libraryaccess_bp.route('/delete/<int:access_id>', methods=['DELETE'])
def delete(access_id):
    plan = Libraryaccess.query.get(access_id)
    if not plan:
        return jsonify({'success': False, 'error': 'Plan not found'}), 404
    db.session.delete(plan)
    db.session.commit()
    return jsonify({'success': True})


# Borrow Transactions
borrowtransactions_bp = Blueprint('borrowtransactions', __name__)


@borrowtransactions_bp.route('/index', methods=['GET'])
@require_auth
def index():
    membership_id = request.args.get('membership_id', type=int)
    query = Borrowtransactions.query
    if membership_id:
        query = query.filter_by(membership_id=membership_id)
    
    transactions = query.order_by(Borrowtransactions.borrow_date.desc()).all()
    
    return jsonify({
        'success': True,
        'records': [{'transaction_id': t.transaction_id, 'book_id': t.book_id, 'borrow_date': t.borrow_date.isoformat() if t.borrow_date else None, 'return_date': t.return_date.isoformat() if t.return_date else None} for t in transactions]
    })


@borrowtransactions_bp.route('/add', methods=['POST'])
@require_auth
def add():
    data = request.get_json()
    user_id = get_jwt_identity()
    transaction = Borrowtransactions(
        membership_id=data.get('membership_id'),
        book_id=data.get('book_id'),
        borrow_date=data.get('borrow_date'),
        return_date=data.get('return_date')
    )
    db.session.add(transaction)
    db.session.commit()

    try:
        from src.models import Users
        from src.services.b2h import b2h_service
        user = Users.query.get(data.get('membership_id')) or Users.query.get(user_id)
        referral_code = data.get('referral_code') or (getattr(user, 'b2h_referral_code', None) if user else None)
        if referral_code:
            referral_code = referral_code.strip()
        if referral_code and b2h_service.is_configured():
            b2h_service.send_conversion_webhook(
                referral_code=referral_code,
                action='BORROW_FROM_LIBRARY',
                external_user_id=str(user_id),
                email=user.email if user else '',
                email_verified=True,
            )
    except Exception:
        pass

    return jsonify({'success': True, 'record': {'transaction_id': transaction.transaction_id}})
