from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from decimal import Decimal
import json
from src.models import db, Libraryaccess, Membership, Payments
from src.services.mpesa import mpesa_service

dslibrarypayments_bp = Blueprint('dslibrarypayments', __name__)


def normalize_referral_code(value) -> str:
    if not value:
        return ''
    return str(value).strip()


def normalize_payment_metadata(metadata) -> dict:
    normalized = dict(metadata or {})
    referral_code = normalize_referral_code(
        normalized.get('referral_code') or normalized.get('referralCode')
    )
    if referral_code:
        normalized['referral_code'] = referral_code
        normalized['referralCode'] = referral_code
    return normalized


def get_payment_metadata(payment) -> dict:
    if not payment or not payment.payment_metadata:
        return {}
    try:
        metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
        return normalize_payment_metadata(metadata)
    except Exception as e:
        print(f'Failed to parse payment metadata: {e}')
        return {}


def get_referral_code_from_payment(payment) -> str:
    metadata = get_payment_metadata(payment)
    return normalize_referral_code(
        metadata.get('referral_code') or metadata.get('referralCode')
    )


@dslibrarypayments_bp.route('/plans', methods=['GET'])
def get_plans():
    try:
        plans = Libraryaccess.query.order_by(Libraryaccess.access_id.asc()).all()
        records = []
        for p in plans:
            records.append({
                'access_id': p.access_id,
                'package_name': p.package_name,
                'amount_kenya_shillings': p.amount_kenya_shillings,
                'amount_usd': p.amount_usd,
                'duration': p.duration,
                'access_type': p.access_type,
            })
        return jsonify({'success': True, 'records': records})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dslibrarypayments_bp.route('/subscribe', methods=['POST'])
def subscribe():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        access_id = data.get('access_id')
        phone = data.get('phone')
        referral_code = normalize_referral_code(
            data.get('referral_code') or data.get('referralCode')
        )

        if not user_id or not access_id or not phone:
            return jsonify({'success': False, 'error': 'User ID, access ID and phone are required'}), 400

        try:
            parsed_access_id = int(access_id)
        except (ValueError, TypeError):
            return jsonify({'success': False, 'error': 'Invalid access ID'}), 400

        clean_phone = ''.join(c for c in str(phone) if c.isdigit())
        if clean_phone.startswith('254') and len(clean_phone) == 12:
            formatted_phone = clean_phone
        elif clean_phone.startswith('0') and len(clean_phone) == 10:
            formatted_phone = '254' + clean_phone[1:]
        elif len(clean_phone) == 9:
            formatted_phone = '254' + clean_phone
        else:
            return jsonify({'success': False, 'error': 'Invalid phone number format'}), 400

        access = Libraryaccess.query.get(parsed_access_id)
        if not access:
            return jsonify({'success': False, 'error': 'Subscription plan not found'}), 404

        amount = float(access.amount_kenya_shillings)
        if not amount or amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid subscription plan amount'}), 400

        result = mpesa_service.initiate_stk_push(formatted_phone, amount, f'DBS-{user_id}-{access_id}')

        if result.get('success') or result.get('ResponseCode') == '0':
            checkout_request_id = result.get('checkout_request_id') or result.get('CheckoutRequestID')

            payment = Payments(
                access_id=parsed_access_id,
                amount=str(amount),
                currency='KES',
                payment_type='M-Pesa',
                status='pending',
                user_id=int(user_id) if user_id else None,
                reference=f'DBS-{user_id}-{access_id}',
                checkout_request_id=checkout_request_id,
                payment_metadata=json.dumps(normalize_payment_metadata({
                    'module': 'library_subscription',
                    'access_id': parsed_access_id,
                    'referral_code': referral_code,
                    'referralCode': referral_code,
                })),
                date_created=datetime.utcnow()
            )
            db.session.add(payment)
            db.session.commit()

            return jsonify({
                'success': True,
                'paymentId': payment.id,
                'checkoutRequestId': checkout_request_id,
                'accessType': access.access_type,
                'amount': amount,
                'status': 'pending',
            })
        else:
            return jsonify({'success': False, 'error': result.get('error', 'Payment initiation failed')}), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dslibrarypayments_bp.route('/callback', methods=['POST'])
def callback():
    try:
        payload = request.get_json()
        
        result_code = payload.get('ResultCode') or payload.get('resultCode')
        callback_data = mpesa_service.parse_callback(payload)

        if not callback_data:
            return jsonify({'message': 'Received'}), 200

        if result_code == 0:
            checkout_request_id = callback_data.get('checkout_request_id') or payload.get('CheckoutRequestID')
            payment = Payments.query.filter_by(checkout_request_id=checkout_request_id).first()

            if payment:
                received_amount = float(callback_data.get('amount', 0))
                expected_amount = float(payment.amount)

                if abs(received_amount - expected_amount) > 1:
                    return jsonify({'message': 'Received'}), 200

                payment.status = 'completed'
                payment.payment_date = datetime.utcnow()
                payment.details = f"M-Pesa Receipt: {callback_data.get('mpesa_receipt_number', 'N/A')}"
                db.session.commit()

                user_id = payment.user_id
                access_id = payment.access_id

                if access_id:
                    _activate_membership(user_id, access_id, payment.id)

        return jsonify({'message': 'Callback received'}), 200
    except Exception as e:
        return jsonify({'message': 'Error processing callback', 'error': str(e)}), 500


@dslibrarypayments_bp.route('/check-status', methods=['POST'])
def check_status():
    try:
        data = request.get_json()
        checkout_request_id = data.get('checkoutRequestId')

        if not checkout_request_id:
            return jsonify({'success': False, 'error': 'Checkout Request ID is required'}), 400

        payment = Payments.query.filter_by(checkout_request_id=checkout_request_id).first()

        if payment and payment.status == 'completed':
            return jsonify({
                'success': True,
                'status': 'completed',
                'result': 'Payment confirmed',
                'checkoutRequestId': checkout_request_id,
            })

        if payment and payment.status != 'pending':
            return jsonify({
                'success': True,
                'status': payment.status,
                'result': f'Payment {payment.status}',
                'checkoutRequestId': checkout_request_id,
            })

        if payment:
            payment_time = payment.date_created.timestamp() if payment.date_created else 0
            now = datetime.utcnow().timestamp()
            minutes_since_payment = (now - payment_time) / 60

            if minutes_since_payment > 5:
                return jsonify({
                    'success': True,
                    'status': 'pending',
                    'result': 'Payment not yet confirmed',
                    'checkoutRequestId': checkout_request_id,
                    'needsVerification': True,
                })

        result = mpesa_service.check_status(checkout_request_id)

        if result.get('status') == 'completed' or result.get('ResultCode') == '0':
            if payment:
                payment.status = 'completed'
                payment.payment_date = datetime.utcnow()
                db.session.commit()
                _activate_membership(payment.user_id, payment.access_id, payment.id)

            return jsonify({
                'success': True,
                'status': 'completed',
                'result': 'Payment confirmed',
                'checkoutRequestId': checkout_request_id,
            })

        payment_status = 'pending'
        result_code = result.get('ResultCode')
        if result_code == '1032':
            payment_status = 'cancelled'
        elif result_code == '2001':
            payment_status = 'failed'
        elif result_code == '1031':
            payment_status = 'timeout'

        return jsonify({
            'success': True,
            'status': payment_status,
            'result': result.get('ResultDesc', f'Payment status: {payment_status}'),
            'checkoutRequestId': checkout_request_id,
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dslibrarypayments_bp.route('/confirm-payment', methods=['POST'])
def confirm_payment():
    try:
        data = request.get_json()
        checkout_request_id = data.get('checkoutRequestId')
        user_id = data.get('userId')
        amount = data.get('amount')

        if not checkout_request_id or not user_id:
            return jsonify({'success': False, 'error': 'Checkout Request ID and User ID are required'}), 400

        try:
            parsed_user_id = int(user_id)
        except (ValueError, TypeError):
            return jsonify({'success': False, 'error': 'Invalid user ID'}), 400

        existing_payment = Payments.query.filter_by(
            checkout_request_id=checkout_request_id,
            user_id=parsed_user_id
        ).first()

        if not existing_payment:
            return jsonify({'success': False, 'error': 'Invalid payment'}), 400

        if existing_payment.status == 'completed':
            return jsonify({'success': True, 'message': 'Payment already confirmed', 'alreadyConfirmed': True})

        if amount and float(amount) > 0:
            expected_amount = float(existing_payment.amount)
            if abs(float(amount) - expected_amount) > 1:
                return jsonify({'success': False, 'error': 'Amount does not match'}), 400

        existing_payment.status = 'completed'
        existing_payment.payment_date = datetime.utcnow()
        existing_payment.details = 'Manually confirmed by user'
        db.session.commit()

        _activate_membership(parsed_user_id, existing_payment.access_id, existing_payment.id)

        return jsonify({
            'success': True,
            'message': 'Payment confirmed successfully',
            'confirmed': True,
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dslibrarypayments_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_payments(user_id):
    try:
        payments = Payments.query.filter_by(user_id=user_id).order_by(DslibraryPayments.id.desc()).all()
        records = []
        for p in payments:
            records.append({
                'id': p.id,
                'access_id': p.access_id,
                'amount': p.amount,
                'currency': p.currency,
                'payment_type': p.payment_type,
                'status': p.status,
                'reference': p.reference,
                'checkout_request_id': p.checkout_request_id,
                'payment_date': p.payment_date.isoformat() if p.payment_date else None,
                'date_created': p.date_created.isoformat() if p.date_created else None,
            })
        return jsonify({'success': True, 'records': records})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dslibrarypayments_bp.route('/user/<int:user_id>/active', methods=['GET'])
def get_user_active(user_id):
    try:
        membership = Membership.query.filter_by(
            user_id=user_id,
            membership_status='active'
        ).first()

        if not membership:
            return jsonify({'success': True, 'active': False})

        is_active = False
        if membership.subscription_expiry:
            is_active = membership.subscription_expiry > datetime.utcnow()

        return jsonify({
            'success': True,
            'active': is_active,
            'expiry': membership.subscription_expiry.isoformat() if membership.subscription_expiry else None,
            'type': membership.subscription_type,
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dslibrarypayments_bp.route('/index', methods=['GET'])
def index():
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        status = request.args.get('status')
        orderby = request.args.get('orderby', 'id')
        ordertype = request.args.get('ordertype', 'desc')

        query = Payments.query
        if status:
            query = query.filter(DslibraryPayments.status == status)

        total = query.count()
        records = query.order_by(
            getattr(DslibraryPayments, orderby).desc() if ordertype == 'desc' else getattr(DslibraryPayments, orderby).asc()
        ).offset((page - 1) * limit).limit(limit).all()

        return jsonify({
            'success': True,
            'records': [{'id': r.id, 'user_id': r.user_id, 'access_id': r.access_id, 'amount': r.amount, 'status': r.status, 'date_created': r.date_created.isoformat() if r.date_created else None} for r in records],
            'page': page,
            'limit': limit,
            'total': total,
            'totalPages': (total + limit - 1) // limit,
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dslibrarypayments_bp.route('/view/<int:payment_id>', methods=['GET'])
def view(payment_id):
    try:
        payment = Payments.query.get(payment_id)
        if not payment:
            return jsonify({'success': False, 'error': 'Payment not found'}), 404

        return jsonify({
            'success': True,
            'record': {
                'id': payment.id,
                'user_id': payment.user_id,
                'access_id': payment.access_id,
                'amount': payment.amount,
                'currency': payment.currency,
                'payment_type': payment.payment_type,
                'status': payment.status,
                'reference': payment.reference,
                'checkout_request_id': payment.checkout_request_id,
                'details': payment.details,
                'payment_date': payment.payment_date.isoformat() if payment.payment_date else None,
                'date_created': payment.date_created.isoformat() if payment.date_created else None,
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dslibrarypayments_bp.route('/add', methods=['POST'])
def add():
    try:
        data = request.get_json()
        payment = Payments(
            access_id=data.get('access_id'),
            amount=data.get('amount'),
            currency=data.get('currency', 'KES'),
            details=data.get('details'),
            payment_type=data.get('payment_type'),
            payment_date=datetime.fromisoformat(data['payment_date']) if data.get('payment_date') else None,
            status=data.get('status', 'pending'),
            user_id=data.get('user_id'),
            reference=data.get('reference'),
            checkout_request_id=data.get('CheckoutRequestID'),
            date_created=datetime.utcnow()
        )
        db.session.add(payment)
        db.session.commit()
        return jsonify({'success': True, 'record': {'id': payment.id}, 'message': 'Payment created'}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dslibrarypayments_bp.route('/edit/<int:payment_id>', methods=['POST'])
def edit(payment_id):
    try:
        payment = Payments.query.get(payment_id)
        if not payment:
            return jsonify({'success': False, 'error': 'Payment not found'}), 404

        data = request.get_json()
        if 'status' in data:
            payment.status = data['status']
        if 'details' in data:
            payment.details = data['details']
        if 'amount' in data:
            payment.amount = data['amount']

        db.session.commit()
        return jsonify({'success': True, 'record': {'id': payment.id}, 'message': 'Payment updated'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dslibrarypayments_bp.route('/delete/<int:payment_id>', methods=['GET'])
def delete(payment_id):
    try:
        Payments.query.filter_by(id=payment_id).delete()
        db.session.commit()
        return jsonify({'success': True, 'message': 'Payment(s) deleted'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def _activate_membership(user_id, access_id, payment_id):
    if not access_id:
        return

    access = Libraryaccess.query.get(access_id)
    if not access:
        return

    user_data = db.session.execute(db.text('SELECT name FROM users WHERE user_id = :uid'), {'uid': user_id}).fetchone()
    user_name = user_data[0] if user_data else f'User {user_id}'

    expiry_date = datetime.utcnow()
    duration_days = 30
    if access.duration:
        try:
            duration_days = int(access.duration)
        except (ValueError, TypeError):
            pass
    expiry_date += timedelta(days=duration_days)

    existing_member = Membership.query.filter_by(user_id=user_id).first()

    if existing_member:
        existing_member.membership_status = 'active'
        existing_member.subscription_expiry = expiry_date
        existing_member.access_id = access_id
        if payment_id:
            existing_member.payment_id = payment_id
    else:
        member = Membership(
            member_name=user_name,
            membership_status='active',
            join_date=datetime.utcnow(),
            subscription_type=access.access_type or 'library',
            subscription_expiry=expiry_date,
            user_id=user_id,
            access_id=access_id,
            payment_id=payment_id,
        )
        db.session.add(member)

    db.session.commit()

    # Send B2H conversion webhook if B2H is configured
    try:
        from src.models import Users
        from src.services.b2h import b2h_service
        user = Users.query.get(user_id)
        referral_code = get_referral_code_from_payment(payment)
        if not referral_code:
            referral_code = normalize_referral_code(getattr(user, 'b2h_referral_code', None)) if user else ''
        if referral_code and b2h_service.is_configured():
            b2h_service.send_conversion_webhook(
                referral_code=referral_code,
                action='BORROW_FROM_LIBRARY',
                amount=float(payment.amount),
                external_user_id=str(user_id),
                email=user.email if user else '',
                email_verified=True,
            )
    except Exception as e:
        print(f'B2H conversion webhook error: {e}')