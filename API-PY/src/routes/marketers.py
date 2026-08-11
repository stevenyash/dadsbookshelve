from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from datetime import datetime
from src.middleware.auth import require_auth
from src.models import db, Marketers, Users, MarketerTransactions, AffiliateLinks, MarketerPoints, Commission, PayoutRequest, MarketerCommissionRate, AffiliateReferral, MarketerPointHistory
from sqlalchemy import func

marketers_bp = Blueprint('marketers', __name__)


@marketers_bp.route('', methods=['GET'])
@marketers_bp.route('/', methods=['GET'])
@marketers_bp.route('/index', methods=['GET'])
@require_auth
def index():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    status = request.args.get('status')
    
    query = Marketers.query
    if status:
        query = query.filter(Marketers.status == status)
    
    total = query.count()
    marketers = query.offset((page - 1) * limit).limit(limit).all()
    
    return jsonify({
        'success': True,
        'records': [m.to_dict() for m in marketers],
        'total': total,
        'page': page,
        'limit': limit
    })


@marketers_bp.route('/view/<int:marketer_id>', methods=['GET'])
@require_auth
def view(marketer_id):
    marketer = Marketers.query.get(marketer_id)
    if not marketer:
        return jsonify({'success': False, 'error': 'Marketer not found'}), 404
    
    return jsonify({
        'success': True,
        'record': marketer.to_dict()
    })


@marketers_bp.route('/add', methods=['POST'])
@require_auth
def add():
    data = request.get_json()
    print(f"DEBUG add marketer data: {data}")
    
    # Handle different input formats
    # Admin create: has firstName, lastName, email
    # Self registration: has user_id from JWT
    user_id = data.get('user_id')
    email = data.get('email')
    
    # If email provided but no user_id, look up user by email
    if not user_id and email:
        from src.models import Users
        user = Users.query.filter_by(email=email).first()
        
        # If user doesn't exist, create them
        new_user_created = False
        temp_password = None
        if not user:
            # Check if firstName/lastName provided
            first_name = data.get('firstName', '')
            last_name = data.get('lastName', '')
            name = f"{first_name} {last_name}".strip() or email.split('@')[0]
            phone = data.get('phone') or data.get('telephone')
            
            # Generate a random password (user will need to reset)
            import secrets
            temp_password = secrets.token_hex(8)
            from src.routes.auth import hash_password
            
            user = Users(
                name=name,
                email=email,
                password=hash_password(temp_password),
                telephone=phone
            )
            db.session.add(user)
            db.session.flush()
            new_user_created = True
            print(f"DEBUG created new user: {user.user_id}")
        
        user_id = user.user_id
        
        # Send welcome credentials if new user created
        if new_user_created and temp_password:
            from src.services.sms import sms_service
            from src.services.email import email_service
            
            phone = data.get('phone') or data.get('telephone')
            
            # Send SMS
            if phone:
                sms_msg = f"Welcome to DADS Bookshelves! Your account has been created. Email: {email}, Password: {temp_password}. Please change your password after login."
                sms_service.send_sms(phone, sms_msg)
            
            # Send Email
            email_subject = "Welcome to DADS Bookshelves - Marketer Account Created"
            email_html = f"""
            <h2>Welcome to DADS Bookshelves!</h2>
            <p>Your marketer account has been created successfully.</p>
            <p><strong>Login Credentials:</strong></p>
            <ul>
                <li>Email: {email}</li>
                <li>Password: {temp_password}</li>
            </ul>
            <p>Please change your password after your first login.</p>
            <p>Login here: <a href="https://dadsbookshelves.com/login">https://dadsbookshelves.com/login</a></p>
            """
            email_service.send_email(email, email_subject, email_html)
    
    # If still no user_id, try JWT identity
    if not user_id:
        user_id = get_jwt_identity()
    
    if not user_id:
        return jsonify({'success': False, 'error': 'User ID is required'}), 400
    
    try:
        user_id = int(user_id) if isinstance(user_id, str) else user_id
    except (ValueError, TypeError):
        return jsonify({'success': False, 'error': f'Invalid user ID: {user_id}'}), 400
    
    print(f"DEBUG final user_id: {user_id}")
    
    existing = Marketers.query.filter_by(user_id=user_id).first()
    if existing:
        print(f"DEBUG existing marketer found: {existing.marketer_id}")
        return jsonify({'success': False, 'error': 'You are already a marketer'}), 400
    
    import uuid
    referral_code = f"REF{uuid.uuid4().hex[:6].upper()}"
    
    marketer = Marketers(
        user_id=user_id,
        referral_code=referral_code,
        mpesa_phone=data.get('mpesa_phone') or data.get('mpesaPhone'),
        commission_rate=data.get('commission_rate', 0.05),
        tier=data.get('tier', 'bronze')
    )
    
    db.session.add(marketer)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': marketer.to_dict(),
        'message': 'Marketer added successfully'
    })


@marketers_bp.route('/edit/<int:marketer_id>', methods=['PUT'])
@require_auth
def edit(marketer_id):
    marketer = Marketers.query.get(marketer_id)
    if not marketer:
        return jsonify({'success': False, 'error': 'Marketer not found'}), 404
    
    data = request.get_json()
    
    # Map camelCase to snake_case
    field_mapping = {
        'mpesaPhone': 'mpesa_phone',
        'commissionRate': 'commission_rate',
        'isActive': 'is_active',
    }
    
    for db_field in ['mpesa_phone', 'commission_rate', 'tier', 'status', 'is_active']:
        # Check both camelCase and snake_case in data
        if db_field in data:
            setattr(marketer, db_field, data[db_field])
        elif db_field in field_mapping and field_mapping[db_field] in data:
            setattr(marketer, db_field, data[field_mapping[db_field]])
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': marketer.to_dict(),
        'message': 'Marketer updated successfully'
    })


@marketers_bp.route('/delete/<int:marketer_id>', methods=['DELETE'])
@require_auth
def delete(marketer_id):
    marketer = Marketers.query.get(marketer_id)
    if not marketer:
        return jsonify({'success': False, 'error': 'Marketer not found'}), 404
    
    marketer.is_active = False
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Marketer deactivated successfully'
    })


@marketers_bp.route('/by-user/<int:user_id>', methods=['GET'])
def by_user(user_id):
    marketer = Marketers.query.filter_by(user_id=user_id).first()
    if not marketer:
        return jsonify({'success': False, 'error': 'Marketer not found'}), 404
    
    # Calculate total points
    from src.models import MarketerPoints
    total_points = db.session.query(func.sum(MarketerPoints.points)).filter(
        MarketerPoints.marketer_id == marketer.marketer_id
    ).scalar() or 0
    
    data = marketer.to_dict()
    data['total_points'] = float(total_points)
    
    return jsonify({
        'success': True,
        'record': data
    })


@marketers_bp.route('/by-referral/<string:referral_code>', methods=['GET'])
def by_referral(referral_code):
    marketer = Marketers.query.filter_by(referral_code=referral_code).first()
    if not marketer:
        return jsonify({'success': False, 'error': 'Marketer not found'}), 404
    
    return jsonify({
        'success': True,
        'record': marketer.to_dict()
    })


# Marketer Transactions
@marketers_bp.route('/transactions/<int:marketer_id>', methods=['GET'])
@require_auth
def transactions(marketer_id):
    txn_type = request.args.get('type')
    query = MarketerTransactions.query.filter_by(marketer_id=marketer_id)
    if txn_type:
        query = query.filter(MarketerTransactions.type == txn_type)
    
    transactions = query.order_by(MarketerTransactions.created_at.desc()).all()
    
    return jsonify({
        'success': True,
        'records': [{
            'transaction_id': t.transaction_id,
            'amount': float(t.amount) if t.amount else None,
            'type': t.type,
            'status': t.status,
            'description': t.description,
            'created_at': t.created_at.isoformat() if t.created_at else None
        } for t in transactions]
    })


# Marketer Points
@marketers_bp.route('/points/<int:marketer_id>', methods=['GET'])
@require_auth
def points(marketer_id):
    pts = MarketerPoints.query.filter_by(marketer_id=marketer_id).order_by(MarketerPoints.created_at.desc()).all()
    
    total = sum(p.points for p in pts)
    
    return jsonify({
        'success': True,
        'records': [{'id': p.id, 'points': p.points, 'type': p.type, 'description': p.description, 'created_at': p.created_at.isoformat() if p.created_at else None} for p in pts],
        'total_points': total
    })


# Commission History
@marketers_bp.route('/<int:marketer_id>/commissions', methods=['GET'])
@require_auth
def commissions(marketer_id):
    comms = Commission.query.filter_by(marketerId=marketer_id).order_by(Commission.createdAt.desc()).all()
    
    return jsonify({
        'success': True,
        'records': [{'id': c.id, 'amount': float(c.amount) if c.amount else None, 'status': c.status, 'source': c.type, 'created_at': c.createdAt.isoformat() if c.createdAt else None} for c in comms]
    })


# Payout Requests
@marketers_bp.route('/<int:marketer_id>/payouts', methods=['GET'])
@require_auth
def payouts(marketer_id):
    payouts = PayoutRequest.query.filter_by(marketerId=marketer_id).order_by(PayoutRequest.createdAt.desc()).all()
    
    return jsonify({
        'success': True,
        'records': [{'id': p.id, 'amount': float(p.amount) if p.amount else None, 'status': p.status, 'phone': p.mpesaPhone, 'created_at': p.createdAt.isoformat() if p.createdAt else None} for p in payouts]
    })


# Request Payout
@marketers_bp.route('/request-payout', methods=['POST'])
@require_auth
def request_payout():
    user_id = get_jwt_identity()
    marketer = Marketers.query.filter_by(user_id=user_id).first()
    
    if not marketer:
        return jsonify({'success': False, 'error': 'Not a marketer'}), 404
    
    data = request.get_json()
    amount = data.get('amount')
    
    if float(amount) > float(marketer.total_earnings - marketer.pending_payout):
        return jsonify({'success': False, 'error': 'Insufficient balance'}), 400
    
    payout = PayoutRequest(
        marketer_id=marketer.marketer_id,
        amount=amount,
        phone=data.get('phone', marketer.mpesa_phone),
        status='pending'
    )
    
    marketer.pending_payout = float(marketer.pending_payout) + float(amount)
    
    db.session.add(payout)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': {'id': payout.id, 'amount': float(payout.amount), 'status': payout.status},
        'message': 'Payout requested successfully'
    })


# Request Payout (by marketer_id)
@marketers_bp.route('/<int:marketer_id>/payout', methods=['POST'])
@require_auth
def payout_by_id(marketer_id):
    marketer = Marketers.query.get(marketer_id)
    if not marketer:
        return jsonify({'success': False, 'error': 'Marketer not found'}), 404
    
    data = request.get_json()
    amount = data.get('amount')
    
    if float(amount) > float(marketer.total_earnings - marketer.pending_payout):
        return jsonify({'success': False, 'error': 'Insufficient balance'}), 400
    
    payout = PayoutRequest(
        marketer_id=marketer.marketer_id,
        amount=amount,
        phone=data.get('mpesaPhone', marketer.mpesa_phone),
        status='pending'
    )
    
    marketer.pending_payout = float(marketer.pending_payout) + float(amount)
    
    db.session.add(payout)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': {'id': payout.id, 'amount': float(payout.amount), 'status': payout.status},
        'message': 'Payout requested successfully'
    })


@marketers_bp.route('/commission-rates', methods=['GET'])
@marketers_bp.route('/commission_rates', methods=['GET'])
def get_commission_rates():
    from src.models import CommissionRate
    rates = CommissionRate.query.filter_by(active=True).all()
    return jsonify({
        'success': True,
        'records': [{'id': r.id, 'name': r.name, 'rate': float(r.rate), 'description': r.description} for r in rates]
    })
