from flask import Blueprint, request, jsonify, make_response
from datetime import datetime
from src.models import db, EbookUploader

ebook_jobs_bp = Blueprint('ebook_jobs', __name__)


@ebook_jobs_bp.route('/index', methods=['GET', 'OPTIONS'])
def handle_index_options():
    return make_response('', 200)


@ebook_jobs_bp.route('', methods=['GET', 'OPTIONS'])
@ebook_jobs_bp.route('/', methods=['GET', 'OPTIONS'])
def handle_base_options():
    return make_response('', 200)


@ebook_jobs_bp.route('/index', methods=['GET'])
def index():
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 100, type=int)
        status_list = request.args.getlist('status')
        
        query = EbookUploader.query
        
        if status_list:
            query = query.filter(EbookUploader.status.in_(status_list))
        
        total = query.count()
        records = query.order_by(EbookUploader.id.desc()).offset((page - 1) * limit).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data': {
                'records': [r.to_dict() for r in records],
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@ebook_jobs_bp.route('/view/<int:ebook_id>', methods=['GET'])
def view(ebook_id):
    try:
        record = EbookUploader.query.get(ebook_id)
        if not record:
            return jsonify({'success': False, 'error': 'Ebook job not found'}), 404
        
        return jsonify({'success': True, 'data': record.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@ebook_jobs_bp.route('/create', methods=['POST'])
def create():
    try:
        data = request.get_json()
        user_id = data.get('user_id', 1)
        
        ebook = EbookUploader(
            book=data.get('book'),
            user_id=user_id,
            final_copy=data.get('final_copy'),
            readium_manifest=data.get('readium_manifest'),
            date_uploaded=datetime.utcnow().isoformat(),
            payment_status=data.get('payment_status', 'pending'),
            payment_id=data.get('payment_id'),
            status=data.get('status', 'pending'),
            book_title=data.get('book_title'),
            isbn=data.get('isbn'),
            author=data.get('author'),
            cover_image=data.get('cover_image')
        )
        db.session.add(ebook)
        db.session.commit()
        
        return jsonify({'success': True, 'data': {'id': ebook.id}, 'message': 'Ebook job created'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@ebook_jobs_bp.route('/edit/<int:ebook_id>', methods=['POST'])
def edit(ebook_id):
    try:
        data = request.get_json()
        
        ebook = EbookUploader.query.get(ebook_id)
        if not ebook:
            return jsonify({'success': False, 'error': 'Ebook job not found'}), 404
        
        for key in ['book', 'final_copy', 'readium_manifest', 'payment_status', 'payment_id', 'status', 'book_title', 'isbn', 'author', 'cover_image']:
            if key in data:
                setattr(ebook, key, data[key])
        
        db.session.commit()
        
        return jsonify({'success': True, 'data': {'id': ebook.id}, 'message': 'Ebook job updated'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@ebook_jobs_bp.route('/delete/<int:ebook_id>', methods=['GET'])
def delete(ebook_id):
    try:
        EbookUploader.query.filter_by(id=ebook_id).delete()
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Ebook job(s) deleted'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@ebook_jobs_bp.route('/update-status/<int:ebook_id>', methods=['POST'])
def update_status(ebook_id):
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'success': False, 'error': 'Status is required'}), 400
        
        ebook = EbookUploader.query.get(ebook_id)
        if not ebook:
            return jsonify({'success': False, 'error': 'Ebook job not found'}), 404
        
        ebook.status = new_status
        
        if new_status == 'completed':
            ebook.processing_completed_at = datetime.utcnow()
        elif new_status in ['processing', 'converting']:
            if not ebook.processing_started_at:
                ebook.processing_started_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'success': True, 'data': {'id': ebook.id, 'status': new_status}, 'message': 'Status updated'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500