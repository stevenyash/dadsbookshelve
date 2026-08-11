from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from decimal import Decimal
from datetime import datetime
import json
import logging
import os
from src.middleware.auth import require_auth
from src.models import db, Payments, PaymentItems, Books, BookPurchases, ExchangeRates
from src.services.mpesa import mpesa_service
from src.services.paypal import paypal_service

logger = logging.getLogger(__name__)

payments_bp = Blueprint('payments', __name__)


@payments_bp.route('')
@payments_bp.route('/index')
def index():
    """Get all payments with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        
        query = Payments.query
        
        # Filter by user if specified
        user_id = request.args.get('user_id', type=int)
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        pagination = query.order_by(Payments.payment_date.desc()).paginate(
            page=page, per_page=limit, error_out=False
        )
        
        return jsonify({
            'success': True,
            'records': [p.to_dict() for p in pagination.items],
            'pagination': {
                'page': pagination.page,
                'pages': pagination.pages,
                'total': pagination.total,
                'per_page': pagination.per_page
            }
        })
    except Exception as e:
        logger.error(f"Error fetching payments: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


MODULE_ACCOUNTS = {
    'library_subscription': {'shortcode': 'DBS-LIB', 'description': 'Library Subscription'},
    'book_purchase': {'shortcode': 'DBS-BOOK', 'description': 'Book Purchase'},
    'ebook': {'shortcode': 'DBS-EBOOK', 'description': 'Ebook Conversion'},
    'membership': {'shortcode': 'DBS-MEM', 'description': 'Membership'},
    'donation': {'shortcode': 'DBS-DON', 'description': 'Donation'},
    'donations': {'shortcode': 'DBS-DON', 'description': 'Donation'},
    'custom': {'shortcode': 'DBS', 'description': 'Custom Payment'},
}


def format_phone_number(phone: str) -> str:
    import re
    clean_phone = re.sub(r'\D', '', str(phone))
    if clean_phone.startswith('254') and len(clean_phone) == 12:
        return clean_phone
    elif clean_phone.startswith('0') and len(clean_phone) == 10:
        return '254' + clean_phone[1:]
    elif len(clean_phone) == 9:
        return '254' + clean_phone
    return clean_phone


def get_module_amount(module: str, metadata: dict) -> dict:
    if module == 'library_subscription':
        access_id = metadata.get('access_id')
        if access_id:
            from src.models import Libraryaccess
            access = Libraryaccess.query.get(access_id)
            if access:
                return {'amount': float(access.price), 'description': f"Library Access - {access.access_type}"}
    if module == 'ebook':
        from src.models import EbookPricing
        pricing = EbookPricing.query.first()
        if pricing:
            return {'amount': float(pricing.KES or 0), 'description': "Ebook Conversion"}
        return {'amount': 1500, 'description': 'Ebook Conversion'}  # fallback default
    return None


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


def get_payment_metadata(payment, fallback_module: str | None = None) -> dict:
    if not payment or not payment.payment_metadata:
        return {'module': fallback_module} if fallback_module else {}
    try:
        metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
        return normalize_payment_metadata(metadata)
    except Exception as e:
        logger.warning('Failed to parse payment metadata: %s', e)
        return {'module': fallback_module} if fallback_module else {}


def get_payment_module(metadata: dict, fallback_module: str) -> str:
    return metadata.get('module') or fallback_module


def get_referral_code_from_metadata(metadata: dict) -> str:
    return normalize_referral_code(
        metadata.get('referral_code') or metadata.get('referralCode')
    )


def get_exchange_rate(from_currency: str, to_currency: str) -> float:
    if from_currency == to_currency:
        return 1.0
    
    rate_record = ExchangeRates.query.filter_by(
        base_currency=from_currency.upper(), 
        target_currency=to_currency.upper()
    ).first()
    
    if rate_record and rate_record.rate:
        return float(rate_record.rate)
    
    rates = {'KES': 1.0, 'USD': 0.0085, 'EUR': 0.0078, 'GBP': 0.0068}
    return rates.get(from_currency, 1.0)


@payments_bp.route('/initiate', methods=['POST'])
@require_auth
def initiate():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    logger.info('Initiating payment', extra={'userId': user_id, 'data': data})
    
    payment_method = data.get('payment_method') or data.get('method') or 'mpesa'
    amount = data.get('amount')
    currency = data.get('currency', 'KES')
    module = data.get('module', 'book_purchase')
    reference = data.get('reference')
    phone = data.get('phone')
    metadata = normalize_payment_metadata(data.get('metadata', {}))
    idempotency_key = data.get('idempotency_key')
    
    import uuid
    if not reference:
        reference = f"DBS-{uuid.uuid4().hex[:8].upper()}"
    
    if idempotency_key:
        existing = Payments.query.filter(Payments.checkout_request_id.startswith(idempotency_key)).first()
        if existing:
            logger.info('Found existing payment for idempotency key', extra={'idempotencyKey': idempotency_key})
            return jsonify({
                'success': True,
                'checkoutRequestId': existing.checkout_request_id,
                'paymentId': existing.id,
                'status': existing.status,
                'message': 'Existing payment retrieved',
            })
    
    final_amount = amount
    final_description = MODULE_ACCOUNTS.get(module, MODULE_ACCOUNTS['custom'])['description']
    
    if not final_amount or final_amount <= 0:
        module_data = get_module_amount(module, metadata)
        if not module_data:
            return jsonify({'success': False, 'status': 'failed', 'message': 'Invalid payment configuration'})
        final_amount = module_data['amount']
        final_description = module_data['description']
    
    account = MODULE_ACCOUNTS.get(module, MODULE_ACCOUNTS['custom'])
    account_ref = f"{account['shortcode']}-{user_id}-{int(datetime.utcnow().timestamp())}"
    
    if payment_method == 'mpesa':
        formatted_phone = format_phone_number(phone) if phone else None
        logger.info('M-Pesa STK push', extra={'phone': formatted_phone, 'amount': final_amount})
        
        result = mpesa_service.initiate_stk_push(formatted_phone, float(final_amount), account_ref)
        
        if result.get('success'):
            payment = Payments(
                user_id=user_id,
                amount=Decimal(str(final_amount)),
                currency=currency,
                payment_method='M-Pesa',
                reference=reference,
                checkout_request_id=result.get('checkout_request_id'),
                status='pending',
                payment_metadata=json.dumps({
                    'module': module,
                    'access_id': metadata.get('access_id'),
                    'ebook_upload_id': metadata.get('ebook_upload_id'),
                    'book_title': metadata.get('book_title'),
                    'author': metadata.get('author'),
                    'isbn': metadata.get('isbn'),
                    'items': metadata.get('items', []),
                    'membership_type': metadata.get('membership_type'),
                    **{k: v for k, v in metadata.items() if k not in ['access_id', 'ebook_upload_id', 'book_title', 'author', 'isbn', 'items', 'membership_type']}
                })
            )
            db.session.add(payment)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'checkoutRequestId': result.get('checkout_request_id'),
                'paymentId': payment.id,
                'status': 'pending',
                'message': 'STK push sent to your phone'
            })
        else:
            return jsonify({'success': False, 'status': 'failed', 'message': result.get('error', 'Payment initiation failed')}), 400
    
    elif payment_method == 'paypal':
        paypal_amount = final_amount
        paypal_currency = currency
        
        if not paypal_currency or paypal_currency == 'KES':
            paypal_currency = 'USD'
            exchange_rate = get_exchange_rate('KES', 'USD')
            paypal_amount = round(float(final_amount) * exchange_rate, 2)
        
        logger.info('PayPal order', extra={'amount': paypal_amount, 'currency': paypal_currency})
        
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        return_url = f"{frontend_url}/payments/status?module={module}"
        cancel_url = f"{frontend_url}/payments/cancelled?module={module}"
        
        result = paypal_service.create_order(
            amount=paypal_amount,
            currency=paypal_currency,
            reference=account_ref,
            description=final_description,
            module=module
        )
        
        if result.get('success') and result.get('approval_url'):
            paypal_checkout_id = f"PAYPAL-{idempotency_key or result.get('order_id')}"
            
            payment = Payments(
                user_id=user_id,
                amount=Decimal(str(final_amount)),
                currency=currency,
                payment_method='paypal',
                reference=reference,
                checkout_request_id=paypal_checkout_id,
                status='pending',
                payment_metadata=json.dumps({
                    'module': module,
                    'orderId': result.get('order_id'),
                    'access_id': metadata.get('access_id'),
                    'ebook_upload_id': metadata.get('ebook_upload_id'),
                    'book_title': metadata.get('book_title'),
                    'author': metadata.get('author'),
                    'isbn': metadata.get('isbn'),
                    'items': metadata.get('items', []),
                    'membership_type': metadata.get('membership_type'),
                    **{k: v for k, v in metadata.items() if k not in ['access_id', 'ebook_upload_id', 'book_title', 'author', 'isbn', 'items', 'membership_type', 'orderId']}
                })
            )
            db.session.add(payment)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'checkoutRequestId': paypal_checkout_id,
                'paymentId': payment.id,
                'status': 'pending',
                'message': result.get('message', 'PayPal order created'),
                'accessToken': result.get('order_id'),
                'approveUrl': result.get('approval_url')
            })
        else:
            return jsonify({'success': False, 'status': 'failed', 'message': result.get('error', 'PayPal order creation failed')}), 400
    
    return jsonify({'success': False, 'status': 'failed', 'message': 'Unsupported payment method'}), 400


@payments_bp.route('/verify', methods=['POST'])
def verify():
    data = request.get_json()
    checkout_request_id = data.get('checkout_request_id') or data.get('checkoutRequestId')
    module = data.get('module', 'book_purchase')
    
    logger.info('Payment verify called', extra={'checkoutRequestId': checkout_request_id, 'module': module})
    
    if not checkout_request_id:
        return jsonify({'success': False, 'status': 'failed', 'message': 'Checkout Request ID required'}), 400
    
    payment = Payments.query.filter(
        (Payments.checkout_request_id == checkout_request_id) |
        (Payments.checkout_request_id.contains(checkout_request_id))
    ).first()
    
    if not payment:
        return jsonify({'success': False, 'status': 'failed', 'message': 'Payment not found'}), 404
    
    payment_metadata = {}
    if payment.payment_metadata:
        try:
            payment_metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
        except:
            pass
    
    actual_module = payment_metadata.get('module', module)
    
    if payment.status == 'completed':
        logger.info('Payment already completed', extra={'userId': payment.user_id, 'module': actual_module})
        handle_payment_completion(payment, actual_module)
        return jsonify({'success': True, 'status': 'completed', 'message': 'Payment confirmed', 'payment': payment.to_dict()})
    
    if payment.payment_method == 'paypal' or checkout_request_id.startswith('PAYPAL-'):
        order_id = checkout_request_id.replace('PAYPAL-', '')
        logger.info('Checking PayPal order status', extra={'orderId': order_id})
        
        result = paypal_service.verify_order(order_id)
        logger.info('PayPal verify result', extra={'result': result})
        
        if result.get('success') and result.get('status') == 'COMPLETED':
            payment.status = 'completed'
            payment.payment_date = datetime.utcnow()
            db.session.commit()
            logger.info('PayPal payment confirmed', extra={'userId': payment.user_id, 'module': actual_module})
            handle_payment_completion(payment, actual_module)
            return jsonify({'success': True, 'status': 'completed', 'message': 'Payment confirmed via PayPal', 'payment': payment.to_dict()})
        
        return jsonify({'success': False, 'status': result.get('status', 'pending'), 'message': result.get('message', f"Payment {result.get('status', 'pending')}")}), 400
    
    if payment.status != 'pending':
        return jsonify({'success': False, 'status': payment.status, 'message': f"Payment {payment.status}", 'payment': payment.to_dict()}), 400
    
    result = mpesa_service.check_status(checkout_request_id)
    logger.info('M-Pesa check result', extra={'result': result})
    
    if result.get('status') == 'completed':
        payment.status = 'completed'
        payment.payment_date = datetime.utcnow()
        db.session.commit()
        logger.info('M-Pesa payment confirmed', extra={'userId': payment.user_id, 'module': actual_module})
        handle_payment_completion(payment, actual_module)
        return jsonify({'success': True, 'status': 'completed', 'message': 'Payment confirmed', 'payment': payment.to_dict()})
    
    payment_status = 'pending'
    error_msg = result.get('error', result.get('message', 'Payment pending'))
    if '1032' in str(error_msg):
        payment_status = 'cancelled'
    elif '2001' in str(error_msg):
        payment_status = 'failed'
    elif '1031' in str(error_msg):
        payment_status = 'timeout'
    
    return jsonify({'success': False, 'status': payment_status, 'message': error_msg}), 400


@payments_bp.route('/mpesa/callback', methods=['POST'])
def mpesa_callback():
    data = request.get_json()
    logger.info('M-Pesa callback received', extra={'data': data})
    
    stk_callback = data.get('Body', {}).get('stkCallback') or data.get('stkCallback') or data
    result = mpesa_service.handle_callback(stk_callback)
    logger.info('M-Pesa callback parsed', extra={'result': result})
    
    if result.get('success'):
        checkout_request_id = stk_callback.get('CheckoutRequestID') or data.get('CheckoutRequestID')
        if checkout_request_id:
            payment = Payments.query.filter(
                (Payments.checkout_request_id == checkout_request_id) |
                (Payments.checkout_request_id.contains(checkout_request_id))
            ).first()
            
            if payment:
                payment.status = 'completed'
                payment.payment_date = datetime.utcnow()
                db.session.commit()
                logger.info('Payment marked as completed', extra={'paymentId': payment.id})
                
                metadata = {}
                if payment.payment_metadata:
                    try:
                        metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
                    except:
                        pass
                
                module = metadata.get('module', 'book_purchase')
                handle_payment_completion(payment, module)
                return jsonify({'success': True})
    
    return jsonify({'success': False}), 400


@payments_bp.route('/paypal/verify', methods=['POST'])
def paypal_verify():
    data = request.get_json()
    token = data.get('token')
    logger.info('PayPal verify', extra={'token': token})
    
    result = paypal_service.verify_order(token)
    logger.info('PayPal verify result', extra={'result': result})
    
    if result.get('success') and result.get('status') in ['APPROVED', 'COMPLETED']:
        payment = Payments.query.filter_by(reference=data.get('reference')).first()
        if payment:
            payment.status = 'completed'
            payment.payment_date = datetime.utcnow()
            db.session.commit()
            return jsonify({'success': True, 'record': payment.to_dict()})
    
    return jsonify({'success': False, 'error': result.get('message', 'Payment verification failed')}), 400


@payments_bp.route('/verify-paypal/<order_id>', methods=['GET'])
def verify_paypal_get(order_id):
    logger.info('PayPal verify GET', extra={'orderId': order_id})
    result = paypal_service.verify_order(order_id)
    logger.info('PayPal verify GET result', extra={'result': result})
    module = 'book_purchase'  # default module
    
    if result.get('success') and result.get('status') == 'COMPLETED':
        checkout_request_id = f"PAYPAL-{order_id}"
        logger.info('COMPLETED - Searching for payment', extra={'checkout_request_id': checkout_request_id})
        
        payment = Payments.query.filter(
            (Payments.checkout_request_id == checkout_request_id) |
            (Payments.checkout_request_id.contains(checkout_request_id))
        ).first()
        
        logger.info('COMPLETED - Payment found', extra={'payment': payment.id if payment else None, 'status': payment.status if payment else None})
        
        if payment and payment.status != 'completed':
            payment.status = 'completed'
            payment.payment_date = datetime.utcnow()
            db.session.commit()
            
            metadata = {}
            if payment.payment_metadata:
                try:
                    metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
                except:
                    pass
            
            actual_module = metadata.get('module', module)
            logger.info('COMPLETED - Activating payment', extra={'module': actual_module, 'paymentId': payment.id})
            handle_payment_completion(payment, actual_module)
        elif payment and payment.status == 'completed':
            # Already completed - still call handle_payment_completion to ensure activation
            logger.info('COMPLETED - Payment already completed, but calling activation again', extra={'paymentId': payment.id})
            metadata = {}
            if payment.payment_metadata:
                try:
                    metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
                except:
                    pass
            actual_module = metadata.get('module', module)
            handle_payment_completion(payment, actual_module)
        
        payment_info = None
        if payment:
            payment_metadata = {}
            if payment.payment_metadata:
                try:
                    payment_metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
                except:
                    pass
            payment_info = {
                'id': payment.id,
                'module': payment_metadata.get('module'),
                'access_id': payment_metadata.get('access_id'),
                'status': payment.status
            }
        
        return jsonify({'success': True, 'status': result.get('status'), 'payment': payment_info})
    
    if result.get('success') and result.get('status') == 'APPROVED':
        module = 'book_purchase'  # default module
        checkout_request_id = f"PAYPAL-{order_id}"
        logger.info('APPROVED - Searching for payment', extra={'checkout_request_id': checkout_request_id})
        
        payment = Payments.query.filter(
            (Payments.checkout_request_id == checkout_request_id) |
            (Payments.checkout_request_id.contains(checkout_request_id))
        ).first()
        
        logger.info('APPROVED - Payment found', extra={'payment': payment.id if payment else None})
        
        if payment:
            payment_metadata = {}
            if payment.payment_metadata:
                try:
                    payment_metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
                except:
                    pass
            payment_info = {
                'id': payment.id,
                'module': payment_metadata.get('module'),
                'access_id': payment_metadata.get('access_id'),
                'status': payment.status
            }
        
        return jsonify({'success': True, 'status': result.get('status'), 'payment': payment_info})
    
    return jsonify({'success': False, 'status': result.get('status', 'unknown'), 'error': result.get('message', 'Payment not completed')}), 400


@payments_bp.route('/paypal/capture', methods=['POST'])
def paypal_capture():
    data = request.get_json()
    token = data.get('token') or data.get('orderId')
    reference = data.get('reference')
    module = data.get('module', 'book_purchase')
    
    logger.info('PayPal capture START', extra={'token': token, 'reference': reference, 'module': module})
    
    if not token:
        return jsonify({'success': False, 'error': 'Token required'}), 400
    
    verify_result = paypal_service.verify_order(token)
    logger.info('PayPal verify result', extra={'verifyResult': verify_result, 'status': verify_result.get('status')})
    
    checkout_request_id = f"PAYPAL-{token}"
    
    if verify_result.get('success') and verify_result.get('status') == 'COMPLETED':
        checkout_request_id = f"PAYPAL-{token}"
        logger.info('COMPLETED - Searching for payment', extra={'checkout_request_id': checkout_request_id})
        
        payment = Payments.query.filter(
            (Payments.checkout_request_id == checkout_request_id) |
            (Payments.checkout_request_id.contains(checkout_request_id))
        ).first()
        
        logger.info('COMPLETED - Payment found', extra={'payment': payment.id if payment else None, 'status': payment.status if payment else None, 'metadata': payment.payment_metadata[:100] if payment and payment.payment_metadata else None})
        
        if payment and payment.status != 'completed':
            payment.status = 'completed'
            payment.payment_date = datetime.utcnow()
            db.session.commit()
            
            metadata = {}
            if payment.payment_metadata:
                try:
                    metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
                except:
                    pass
            
            actual_module = metadata.get('module', module)
            handle_payment_completion(payment, actual_module)
        
        return jsonify({'success': True, 'message': 'Payment already completed', 'record': payment.to_dict() if payment else None})
    
    if verify_result.get('success') and verify_result.get('status') == 'APPROVED':
        capture_result = paypal_service.capture_order(token)
        logger.info('PayPal capture result', extra={'captureResult': capture_result})
        
        checkout_request_id = f"PAYPAL-{token}"
        logger.info('Searching for payment', extra={'checkout_request_id': checkout_request_id})
        
        payment = Payments.query.filter(
            (Payments.checkout_request_id == checkout_request_id) |
            (Payments.checkout_request_id.contains(checkout_request_id))
        ).first()
        
        logger.info('Payment found', extra={'payment': payment.id if payment else None, 'status': payment.status if payment else None, 'metadata': payment.payment_metadata if payment else None})
        
        if capture_result.get('success') and payment:
            payment.status = 'completed'
            payment.payment_date = datetime.utcnow()
            db.session.commit()
            
            metadata = {}
            if payment.payment_metadata:
                try:
                    metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
                except:
                    pass
            
            actual_module = metadata.get('module', module)
            logger.info('PayPal payment completed, calling handle_payment_completion', extra={'module': actual_module, 'paymentId': payment.id, 'metadata': metadata})
            handle_payment_completion(payment, actual_module)
            return jsonify({'success': True, 'record': payment.to_dict()})
        
        if payment and payment.status != 'completed':
            payment.status = 'completed'
            payment.payment_date = datetime.utcnow()
            db.session.commit()
            
            metadata = {}
            if payment.payment_metadata:
                try:
                    metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
                except:
                    pass
            
            actual_module = metadata.get('module', module)
            handle_payment_completion(payment, actual_module)
            return jsonify({'success': True, 'record': payment.to_dict()})
        
        # Payment not found - try to find by reference or order_id
        payment_by_ref = Payments.query.filter(
            (Payments.reference.contains(token)) |
            (Payments.payment_metadata.contains(token))
        ).first()
        
        if payment_by_ref and payment_by_ref.status != 'completed':
            logger.info('Found payment by reference', extra={'paymentId': payment_by_ref.id})
            payment_by_ref.status = 'completed'
            payment_by_ref.payment_date = datetime.utcnow()
            db.session.commit()
            
            metadata = {}
            if payment_by_ref.payment_metadata:
                try:
                    metadata = json.loads(payment_by_ref.payment_metadata) if isinstance(payment_by_ref.payment_metadata, str) else payment_by_ref.payment_metadata
                except:
                    pass
            
            actual_module = metadata.get('module', module)
            handle_payment_completion(payment_by_ref, actual_module)
            return jsonify({'success': True, 'record': payment_by_ref.to_dict()})
    
    # Fallthrough - neither COMPLETED nor APPROVED
    # Check if payment is already completed (may have been completed by verify endpoint)
    existing_payment = Payments.query.filter(
        (Payments.checkout_request_id == checkout_request_id) |
        (Payments.checkout_request_id.contains(checkout_request_id))
    ).first()
    
    if existing_payment and existing_payment.status == 'completed':
        logger.info('Payment already completed via verify endpoint', extra={'paymentId': existing_payment.id})
        return jsonify({'success': True, 'message': 'Payment already completed', 'record': existing_payment.to_dict()})
    
    logger.warning('PayPal capture fallthrough', extra={
        'verify_success': verify_result.get('success'),
        'verify_status': verify_result.get('status'),
        'checkout_request_id': checkout_request_id
    })
    return jsonify({'success': False, 'error': 'Payment capture failed', 'details': verify_result}), 400


def activate_library_subscription(user_id: int, access_id_raw: any) -> dict:
    try:
        logger.info('Activating library subscription', extra={'userId': user_id, 'accessId': access_id_raw})
        access_id = int(access_id_raw) if access_id_raw else None
        
        if not access_id:
            return {'success': False, 'message': 'Invalid access ID'}
        
        from src.models import Libraryaccess, Users, Membership
        
        access = Libraryaccess.query.get(access_id)
        if not access:
            return {'success': False, 'message': 'Access plan not found'}
        
        user = Users.query.get(user_id)
        user_name = user.name if user else f"User {user_id}"
        
        from datetime import timedelta
        expiry_date = datetime.utcnow()
        duration_days = 30
        if access.duration:
            dur_str = str(access.duration).lower()
            if 'day' in dur_str:
                duration_days = int(''.join(filter(str.isdigit, dur_str)) or 30)
            elif 'month' in dur_str:
                duration_days = int(''.join(filter(str.isdigit, dur_str)) or 1) * 30
        expiry_date = expiry_date + timedelta(days=duration_days)
        
        existing_member = Membership.query.filter_by(user_id=user_id).first()
        
        if existing_member:
            logger.info('Updating existing membership', extra={'membershipId': existing_member.membership_id})
            existing_member.membership_status = 'active'
            existing_member.subscription_expiry = expiry_date
            existing_member.access_id = access_id
            db.session.commit()
        else:
            logger.info('Creating new membership', extra={'userId': user_id})
            membership = Membership(
                member_name=user_name,
                membership_status='active',
                join_date=datetime.utcnow(),
                subscription_type=access.access_type or 'library',
                subscription_expiry=expiry_date,
                user_id=user_id,
                access_id=access_id
            )
            db.session.add(membership)
            db.session.commit()
        
        logger.info('Library subscription activated', extra={'userId': user_id})
        return {'success': True, 'message': 'Library subscription activated'}
    
    except Exception as e:
        logger.error('Library subscription activation failed', extra={'error': str(e)})
        return {'success': False, 'message': f'Failed to activate subscription: {str(e)}'}


def handle_payment_completion(payment, module: str):
    from src.services.email import email_service
    print(f'handle_payment_completion: module={module}, payment_id={payment.id}')
    logger.info('Payment completion processing', extra={'module': module, 'paymentId': payment.id})
    
    metadata = get_payment_metadata(payment)
    full_metadata = {**metadata}
    
    if module == 'ebook':
        ebook_upload_id = full_metadata.get('ebook_upload_id')
        if ebook_upload_id:
            try:
                from src.models import EbookUploader
                ebook = EbookUploader.query.get(ebook_upload_id)
                if ebook:
                    ebook.payment_status = 'paid'
                    ebook.status = 'pending'
                    db.session.commit()
                    logger.info('Ebook payment updated', extra={'ebookId': ebook_upload_id})
                    
                    # Process referral commission for the marketer
                    try:
                        referral_code = full_metadata.get('referral_code')
                        if referral_code:
                            from src.models import Marketers, MarketerTransactions, Referrals
                            marketer = Marketers.query.filter_by(referral_code=referral_code).first()
                            if marketer:
                                commission_rate = float(marketer.commission_rate) if marketer.commission_rate else 0.05
                                commission_amount = float(payment.amount) * commission_rate
                                
                                # Create marketer transaction
                                txn = MarketerTransactions(
                                    marketer_id=marketer.marketer_id,
                                    type='commission',
                                    amount=commission_amount,
                                    status='completed',
                                    description=f'Commission from ebook conversion',
                                    currency=payment.currency,
                                    reference=f'PAY-{payment.id}'
                                )
                                db.session.add(txn)
                                
                                # Update marketer earnings
                                marketer.total_earnings = float(marketer.total_earnings or 0) + commission_amount
                                marketer.successful_referrals = (marketer.successful_referrals or 0) + 1
                                
                                # Update referral record
                                referral = Referrals.query.filter_by(referred_id=payment.user_id).first()
                                if referral:
                                    referral.first_purchase_id = payment.id
                                    referral.first_purchase_amount = payment.amount
                                    referral.commission_earned = commission_amount
                                    referral.status = 'completed'
                                
                                db.session.commit()
                                logger.info('Ebook referral commission processed', extra={
                                    'marketerId': marketer.marketer_id, 
                                    'amount': commission_amount
                                })
                    except Exception as e:
                        logger.error('Ebook referral commission processing failed', extra={'error': str(e)})
            except Exception as e:
                logger.error('Ebook update failed', extra={'error': str(e)})
    
    elif module == 'library_subscription':
        access_id = full_metadata.get('access_id')
        logger.info('Processing library_subscription', extra={'accessId': access_id, 'paymentId': payment.id})
        if access_id and payment.user_id:
            result = activate_library_subscription(payment.user_id, access_id)
            if not result.get('success'):
                logger.error('Library subscription activation failed', extra={'error': result.get('message')})
    
    elif module == 'book_purchase':
        from src.models import BookPurchases
        # Check if order already exists for this payment via BookPurchases
        existing_purchase = BookPurchases.query.filter_by(payment_id=payment.id, status='completed').first()
        if existing_purchase:
            logger.info('Order already exists for payment', extra={'paymentId': payment.id, 'purchaseId': existing_purchase.id})
            return  # Don't create duplicate
        
        items = full_metadata.get('items', [])
        logger.info('Processing book_purchase', extra={
            'itemsCount': len(items) if items else 0, 
            'metadataKeys': list(full_metadata.keys()),
            'itemsFirst': items[0] if items else None
        })
        
        if items and isinstance(items, list):
            print(f'BOOK_PURCHASE: items={items}')
            logger.info('Order creation START', extra={'items': items})
            try:
                from src.models import Orders, OrderItems
                logger.info('After import Orders')

                order = Orders(
                    user_id=payment.user_id,
                    order_date=datetime.utcnow(),
                    total_amount=payment.amount,
                    status='completed'
                )
                logger.info('Before add order')
                db.session.add(order)
                logger.info('Before flush order')
                db.session.flush()
                logger.info('After flush, order_id', extra={'order_id': order.order_id})

                for item in items:
                    book_id = item.get('book_id')
                    if book_id:
                        order_item = OrderItems(
                            order_id=order.order_id,
                            book_id=book_id,
                            quantity=item.get('quantity', 1),
                            price=item.get('price', 0),
                            total_price=item.get('price', 0) * item.get('quantity', 1),
                            order_type=item.get('format', 'digital')
                        )
                        db.session.add(order_item)
                        logger.info('Added order item', extra={'book_id': book_id})

                        if item.get('format') in ['digital', 'digital_book']:
                            purchase = BookPurchases(
                                user_id=payment.user_id,
                                book_id=book_id,
                                payment_id=payment.id,
                                book_format='digital_book',
                                status='completed',
                                created_at=datetime.utcnow()
                            )
                            db.session.add(purchase)
                            logger.info('Added purchase', extra={'book_id': book_id})

                            book = Books.query.get(book_id)
                            if book:
                                book.purchase_count = (book.purchase_count or 0) + 1

                logger.info('Before commit')
                db.session.commit()
                print(f'ORDER SUCCESS: order_id={order.order_id}')
                logger.info('Order created SUCCESS', extra={'orderId': order.order_id})
            except Exception as e:
                print(f'ORDER ERROR: {type(e).__name__}: {e}')
                logger.error('Order creation FAILED', extra={'error': str(e), 'type': type(e).__name__})
    
    elif module in ['donation', 'donations']:
        try:
            from src.models import Donations
            from src.models import Users
            user = Users.query.get(payment.user_id)
            donation = Donations(
                name=user.name if user else f"User {payment.user_id}",
                amount=str(payment.amount),
                reference=payment.reference,
                payment_date=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
                checkout_request_id=getattr(payment, 'checkout_request_id', ''),
                currency=payment.currency,
                payment_type=payment.payment_method,
                status='completed'
            )
            db.session.add(donation)
            db.session.commit()
            logger.info('Donation recorded', extra={'amount': float(payment.amount), 'currency': payment.currency})
        except Exception as e:
            logger.error('Donation recording failed', extra={'error': str(e)})
    
    elif module == 'membership':
        membership_type = full_metadata.get('membership_type', 'standard')
        try:
            from src.models import Membership
            existing = Membership.query.filter_by(user_id=payment.user_id, membership_status='active').first()
            if existing:
                existing.membership_status = 'active'
                from datetime import timedelta
                if existing.subscription_expiry:
                    existing.subscription_expiry += timedelta(days=30)
                db.session.commit()
            else:
                membership = Membership(
                    user_id=payment.user_id,
                    member_name=f"User {payment.user_id}",
                    membership_status='active',
                    subscription_type=membership_type,
                    join_date=datetime.utcnow(),
                    payment_id=payment.id
                )
                db.session.add(membership)
                db.session.commit()
            logger.info('Membership activated', extra={'userId': payment.user_id})
        except Exception as e:
            logger.error('Membership activation failed', extra={'error': str(e)})
    
    try:
        from src.models import Users
        from src.services.b2h import b2h_service
        user = Users.query.get(payment.user_id)
        referral_code = get_referral_code_from_metadata(full_metadata)
        if not referral_code:
            referral_code = normalize_referral_code(getattr(user, 'b2h_referral_code', None)) if user else ''
        if referral_code and b2h_service.is_configured():
            action_map = {
                'ebook': 'BORROW_FROM_LIBRARY',
                'ebook_purchase': 'EBOOK_PURCHASE',
                'library_subscription': 'BORROW_FROM_LIBRARY',
                'book_purchase': 'PURCHASE_BOOK',
                'donations': 'DONATION_MADE',
                'donation': 'DONATION_MADE',
                'membership': 'MEMBERSHIP_SUBSCRIBED',
            }
            b2h_action = action_map.get(module, 'PURCHASE_BOOK')
            b2h_service.send_conversion_webhook(
                referral_code=referral_code,
                action=b2h_action,
                amount=float(payment.amount),
                external_user_id=str(payment.user_id) if user else '',
                email=user.email if user else '',
                email_verified=True,
            )
    except Exception as e:
        logger.error('B2H conversion webhook failed', extra={'error': str(e)})


@payments_bp.route('/capture-paypal', methods=['POST'])
def capture_paypal_alias():
    return paypal_capture()


@payments_bp.route('/my-payments', methods=['GET'])
@payments_bp.route('/my', methods=['GET'])
@require_auth
def my_payments():
    user_id = get_jwt_identity()
    print(f'my_payments raw: user_id={user_id}')
    if not user_id:
        return jsonify({'success': True, 'records': [], 'message': 'No user_id'})
    try:
        user_id = int(user_id)
    except:
        return jsonify({'success': True, 'records': [], 'message': 'Invalid user_id'})
    print(f'my_payments: user_id={user_id}')
    payments = Payments.query.filter_by(user_id=user_id).order_by(Payments.payment_date.desc()).all()
    print(f'my_payments: found={len(payments)}')
    return jsonify({'success': True, 'records': [p.to_dict() for p in payments]})


@payments_bp.route('/confirm-payment', methods=['POST'])
def confirm_payment():
    data = request.get_json()
    checkout_request_id = data.get('checkoutRequestId') or data.get('checkout_request_id')
    user_id = data.get('userId') or data.get('user_id')
    amount = data.get('amount')
    
    logger.info('Confirm payment called', extra={'checkoutRequestId': checkout_request_id, 'userId': user_id})
    
    if not checkout_request_id:
        return jsonify({'success': False, 'error': 'Checkout Request ID required'}), 400
    
    if not user_id:
        return jsonify({'success': False, 'error': 'User ID required'}), 400
    
    try:
        parsed_user_id = int(user_id)
    except (ValueError, TypeError):
        return jsonify({'success': False, 'error': 'Invalid user ID'}), 400
    
    payment = Payments.query.filter(
        (Payments.checkout_request_id == checkout_request_id) |
        (Payments.checkout_request_id.contains(checkout_request_id))
    ).first()
    
    if not payment:
        return jsonify({'success': False, 'error': 'Payment not found'}), 400
    
    if payment.user_id != parsed_user_id:
        return jsonify({'success': False, 'error': 'Payment belongs to different user'}), 403
    
    if payment.status == 'completed':
        metadata = {}
        if payment.payment_metadata:
            try:
                metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
            except:
                pass
        module = metadata.get('module', 'library_subscription')
        handle_payment_completion(payment, module)
        return jsonify({'success': True, 'message': 'Payment already confirmed', 'alreadyConfirmed': True})
    
    if amount and float(amount) > 0:
        expected_amount = float(payment.amount)
        if abs(float(amount) - expected_amount) > 1:
            return jsonify({'success': False, 'error': 'Amount does not match'}), 400
    
    payment.status = 'completed'
    payment.payment_date = datetime.utcnow()
    db.session.commit()
    logger.info('Payment manually confirmed', extra={'paymentId': payment.id})
    
    metadata = {}
    if payment.payment_metadata:
        try:
            metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
        except:
            pass
    
    module = metadata.get('module', 'library_subscription')
    handle_payment_completion(payment, module)
    
    return jsonify({
        'success': True,
        'message': 'Payment confirmed successfully',
        'confirmed': True,
    })