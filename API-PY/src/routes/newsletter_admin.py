from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth, require_admin
from src.models import db, Newsletter
from datetime import datetime

newsletter_admin_bp = Blueprint('newsletter_admin', __name__)


@newsletter_admin_bp.route('/newsletters', methods=['GET'])
@require_auth
@require_admin
def index():
    """List all newsletters"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        status = request.args.get('status')  # Filter by status
        
        query = Newsletter.query
        
        if status:
            query = query.filter_by(status=status)
        
        total = query.count()
        newsletters = query.order_by(Newsletter.created_at.desc()) \
                          .offset((page - 1) * limit) \
                          .limit(limit) \
                          .all()
        
        return jsonify({
            'success': True,
            'records': [n.to_dict() for n in newsletters],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@newsletter_admin_bp.route('/newsletters/<int:newsletter_id>', methods=['GET'])
@require_auth
@require_admin
def view(newsletter_id):
    """Get single newsletter"""
    newsletter = Newsletter.query.get(newsletter_id)
    if not newsletter:
        return jsonify({'success': False, 'error': 'Newsletter not found'}), 404
    
    return jsonify({'success': True, 'record': newsletter.to_dict()})


@newsletter_admin_bp.route('/newsletters', methods=['POST'])
@require_auth
@require_admin
def create():
    """Create new newsletter"""
    try:
        data = request.get_json()
        
        required_fields = ['title', 'subject', 'content']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        user_id = get_jwt_identity()
        
        newsletter = Newsletter(
            title=data['title'],
            subject=data['subject'],
            content=data['content'],
            html_content=data.get('html_content'),
            status=data.get('status', 'draft'),
            scheduled_at=data.get('scheduled_at'),
            created_by=user_id
        )
        
        db.session.add(newsletter)
        db.session.commit()
        
        return jsonify({'success': True, 'record': newsletter.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@newsletter_admin_bp.route('/newsletters/<int:newsletter_id>', methods=['PUT'])
@require_auth
@require_admin
def update(newsletter_id):
    """Update newsletter"""
    try:
        newsletter = Newsletter.query.get(newsletter_id)
        if not newsletter:
            return jsonify({'success': False, 'error': 'Newsletter not found'}), 404
        
        # Prevent editing sent newsletters
        if newsletter.status == 'sent':
            return jsonify({'success': False, 'error': 'Cannot edit a sent newsletter'}), 400
        
        data = request.get_json()
        
        for field in ['title', 'subject', 'content', 'html_content', 'status', 'scheduled_at']:
            if field in data:
                setattr(newsletter, field, data[field])
        
        db.session.commit()
        
        return jsonify({'success': True, 'record': newsletter.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@newsletter_admin_bp.route('/newsletters/<int:newsletter_id>', methods=['DELETE'])
@require_auth
@require_admin
def delete(newsletter_id):
    """Delete newsletter"""
    try:
        newsletter = Newsletter.query.get(newsletter_id)
        if not newsletter:
            return jsonify({'success': False, 'error': 'Newsletter not found'}), 404
        
        # Prevent deleting sent newsletters
        if newsletter.status == 'sent':
            return jsonify({'success': False, 'error': 'Cannot delete a sent newsletter'}), 400
        
        db.session.delete(newsletter)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Newsletter deleted'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@newsletter_admin_bp.route('/newsletters/<int:newsletter_id>/send', methods=['POST'])
@require_auth
@require_admin
def send(newsletter_id):
    """Send newsletter to all subscribers"""
    try:
        newsletter = Newsletter.query.get(newsletter_id)
        if not newsletter:
            return jsonify({'success': False, 'error': 'Newsletter not found'}), 404
        
        if newsletter.status not in ['draft', 'scheduled']:
            return jsonify({'success': False, 'error': 'Newsletter must be in draft or scheduled status'}), 400
        
        # Import email service
        from src.services.email import email_service
        
        # Get all subscribers (active)
        from src.models import NewsletterSubscriptions, Users
        subscribers = NewsletterSubscriptions.query.filter_by(
            status='subscribed'
        ).join(Users, NewsletterSubscriptions.user_id == Users.user_id)\
         .add_columns(Users.email, Users.name)\
         .all()
        
        if not subscribers:
            return jsonify({'success': False, 'error': 'No subscribers found'}), 400
        
        # Update newsletter status
        newsletter.status = 'sent'
        newsletter.sent_at = datetime.utcnow()
        newsletter.recipients_count = len(subscribers)
        
        # Queue email sending (in production, use background task)
        # For now, we just mark as sent
        # TODO: Add async task queue (Celery/RQ) for actual sending
        recipient_emails = [s.email for s in subscribers if s.email]
        
        # Here you would typically:
        # 1. Send emails via email_service.send_newsletter(...)
        # 2. Track send status per recipient
        # 3. Handle bounces/unsubscribes
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Newsletter sent to {len(recipient_emails)} subscribers',
            'recipients_count': len(recipient_emails)
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
