from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth
from src.models import db, AffiliateLinks, Marketers, Books, Genres, AffiliateReferral, Users

affiliates_bp = Blueprint('affiliates', __name__)


@affiliates_bp.route('/index', methods=['GET'])
@require_auth
def index():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    
    query = AffiliateLinks.query
    total = query.count()
    links = query.offset((page - 1) * limit).limit(limit).all()
    
    return jsonify({
        'success': True,
        'records': [{'link_id': l.link_id, 'marketer_id': l.marketer_id, 'book_id': l.book_id, 'custom_url': l.custom_url, 'clicks': l.clicks, 'conversions': l.conversions} for l in links],
        'total': total,
        'page': page,
        'limit': limit
    })


@affiliates_bp.route('/view/<int:link_id>', methods=['GET'])
def view(link_id):
    link = AffiliateLinks.query.get(link_id)
    if not link:
        return jsonify({'success': False, 'error': 'Link not found'}), 404
    return jsonify({'success': True, 'record': {'link_id': link.link_id, 'custom_url': link.custom_url, 'clicks': link.clicks}})


@affiliates_bp.route('/add', methods=['POST'])
@require_auth
def add():
    data = request.get_json()
    marketer_id = data.get('marketer_id')
    
    link = AffiliateLinks(
        marketer_id=marketer_id,
        book_id=data.get('book_id'),
        genre_id=data.get('genre_id'),
        custom_url=data.get('custom_url')
    )
    db.session.add(link)
    db.session.commit()
    return jsonify({'success': True, 'record': {'link_id': link.link_id}})


@affiliates_bp.route('/edit/<int:link_id>', methods=['PUT'])
@require_auth
def edit(link_id):
    link = AffiliateLinks.query.get(link_id)
    if not link:
        return jsonify({'success': False, 'error': 'Link not found'}), 404
    data = request.get_json()
    for key in ['book_id', 'genre_id', 'custom_url']:
        if key in data:
            setattr(link, key, data[key])
    db.session.commit()
    return jsonify({'success': True})


@affiliates_bp.route('/delete/<int:link_id>', methods=['DELETE'])
@require_auth
def delete(link_id):
    link = AffiliateLinks.query.get(link_id)
    if not link:
        return jsonify({'success': False, 'error': 'Link not found'}), 404
    db.session.delete(link)
    db.session.commit()
    return jsonify({'success': True})


@affiliates_bp.route('/track/<int:link_id>', methods=['POST'])
def track(link_id):
    link = AffiliateLinks.query.get(link_id)
    if not link:
        return jsonify({'success': False, 'error': 'Link not found'}), 404
    
    link.clicks += 1
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Click tracked'})


@affiliates_bp.route('/by-marketer/<int:marketer_id>', methods=['GET'])
def by_marketer(marketer_id):
    links = AffiliateLinks.query.filter_by(marketer_id=marketer_id).all()
    return jsonify({
        'success': True,
        'records': [{'link_id': l.link_id, 'book_id': l.book_id, 'custom_url': l.custom_url, 'clicks': l.clicks, 'conversions': l.conversions} for l in links]
    })


# Referrals
from src.models import Referrals

referrals_bp = Blueprint('referrals', __name__)


@referrals_bp.route('/index', methods=['GET'])
@require_auth
def index():
    referrer_id = request.args.get('referrer_id', type=int)
    query = Referrals.query
    if referrer_id:
        query = query.filter_by(referrer_id=referrer_id)
    
    referrals = query.all()
    return jsonify({
        'success': True,
        'records': [{'referral_id': r.referral_id, 'referrer_id': r.referrer_id, 'referred_id': r.referred_id, 'referral_code': r.referral_code, 'status': r.status} for r in referrals]
    })


@referrals_bp.route('/by-code/<string:code>', methods=['GET'])
def by_code(code):
    referral = Referrals.query.filter_by(referral_code=code).first()
    if not referral:
        return jsonify({'success': False, 'error': 'Referral not found'}), 404
    return jsonify({'success': True, 'record': {'referral_id': referral.referral_id, 'referrer_id': referral.referrer_id}})


@referrals_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    import uuid
    code = f"REF{uuid.uuid4().hex[:8].upper()}"
    
    referral = Referrals(
        referrer_id=data.get('referrer_id'),
        referral_code=code,
        referral_source=data.get('referral_source', 'direct')
    )
    db.session.add(referral)
    db.session.commit()
    return jsonify({'success': True, 'record': {'referral_id': referral.referral_id, 'referral_code': code}})


# Affiliate Referrals
affiliate_referral_bp = Blueprint('affiliate_referral', __name__)


@affiliate_referral_bp.route('/index', methods=['GET'])
@require_auth
def index():
    marketer_id = request.args.get('marketer_id', type=int)
    query = AffiliateReferral.query
    if marketer_id:
        query = query.filter_by(marketer_id=marketer_id)
    
    refs = query.all()
    return jsonify({
        'success': True,
        'records': [{'id': r.id, 'marketer_id': r.marketer_id, 'referred_user_id': r.referred_user_id, 'status': r.status} for r in refs]
    })
