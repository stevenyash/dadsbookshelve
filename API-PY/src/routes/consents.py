from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth
from src.models import db, Consents

consents_bp = Blueprint('consents', __name__)


@consents_bp.route('/index', methods=['GET'])
@require_auth
def index():
    user_id = request.args.get('user_id', type=int)
    query = Consents.query
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    consents = query.all()
    return jsonify({
        'success': True,
        'records': [{'consent_id': c.consent_id, 'user_id': c.user_id, 'agreement_confirmation': c.agreement_confirmation, 'ownership_declaration': c.ownership_declaration, 'consent_date': c.consent_date.isoformat() if c.consent_date else None} for c in consents]
    })


@consents_bp.route('/view/<int:consent_id>', methods=['GET'])
@require_auth
def view(consent_id):
    consent = Consents.query.get(consent_id)
    if not consent:
        return jsonify({'success': False, 'error': 'Consent not found'}), 404
    return jsonify({'success': True, 'record': {'consent_id': consent.consent_id, 'agreement': consent.agreement, 'declaration': consent.declaration}})


@consents_bp.route('/add', methods=['POST'])
@require_auth
def add():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    consent = Consents(
        user_id=user_id,
        agreement=data.get('agreement'),
        declaration=data.get('declaration'),
        agreement_confirmation=data.get('agreement_confirmation', False),
        ownership_declaration=data.get('ownership_declaration', False),
        revenue_sharing_percentage=data.get('revenue_sharing_percentage'),
        pre_publisher=data.get('pre_publisher'),
        pre_publisher_name=data.get('pre_publisher_name'),
        pre_publisher_isbn=data.get('pre_publisher_isbn'),
        e_signature=data.get('e_signature')
    )
    db.session.add(consent)
    db.session.commit()
    return jsonify({'success': True, 'record': {'consent_id': consent.consent_id}})


# Newsletter Subscriptions
from src.models import NewsletterSubscriptions

newsletter_bp = Blueprint('newsletter', __name__)


@newsletter_bp.route('/index', methods=['GET'])
def index():
    status = request.args.get('status', 'subscribed')
    subs = NewsletterSubscriptions.query.filter_by(status=status).all()
    return jsonify({
        'success': True,
        'records': [{'id': s.id, 'email': s.email, 'status': s.status, 'subscribed_at': s.subscribed_at.isoformat() if s.subscribed_at else None} for s in subs]
    })


@newsletter_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    email = data.get('email')
    
    existing = NewsletterSubscriptions.query.filter_by(email=email).first()
    if existing:
        existing.status = 'subscribed'
        db.session.commit()
        return jsonify({'success': True, 'message': 'Resubscribed successfully'})
    
    import uuid
    token = uuid.uuid4().hex
    
    sub = NewsletterSubscriptions(
        email=email,
        unsubscribe_token=token,
        status='subscribed'
    )
    db.session.add(sub)
    db.session.commit()
    return jsonify({'success': True, 'record': {'id': sub.id}})


@newsletter_bp.route('/unsubscribe/<string:token>', methods=['POST'])
def unsubscribe(token):
    sub = NewsletterSubscriptions.query.filter_by(unsubscribe_token=token).first()
    if not sub:
        return jsonify({'success': False, 'error': 'Subscription not found'}), 404
    sub.status = 'unsubscribed'
    db.session.commit()
    return jsonify({'success': True, 'message': 'Unsubscribed successfully'})


# Limitless Content
from src.models import Limitless

limitless_bp = Blueprint('limitless', __name__)


@limitless_bp.route('/', methods=['GET'])
def index():
    content = Limitless.query.filter_by(current=True).first()
    if not content:
        return jsonify({'success': True, 'record': {'content': ''}})
    return jsonify({'success': True, 'record': {'content': content.content, 'current': content.current}})


@limitless_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    content = Limitless(content=data.get('content'), current=data.get('current', False))
    db.session.add(content)
    db.session.commit()
    return jsonify({'success': True, 'record': {'id': content.id}})


@limitless_bp.route('/set-current/<int:id>', methods=['POST'])
def set_current(id):
    Limitless.query.update({'current': False})
    content = Limitless.query.get(id)
    if content:
        content.current = True
        db.session.commit()
    return jsonify({'success': True})
