from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from datetime import datetime
from src.models import db, EbookUploader, Users, Roles

ebookuploader_bp = Blueprint('ebookuploader', __name__)


@ebookuploader_bp.route('/index', methods=['GET'])
@jwt_required()
def index():
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 100, type=int)
        # Use getlist to handle array parameters like status[]=pending&status[]=converting
        status_list = request.args.getlist('status')
        
        user_id = get_jwt_identity()
        
        user = Users.query.get(user_id)
        user_role = 'user'
        if user and user.user_role_id:
            role = Roles.query.get(user.user_role_id)
            user_role = role.role_code if role else 'user'
        
        query = EbookUploader.query
        
        if user_role not in ['admin', 'super_admin']:
            query = query.filter(EbookUploader.user_id == user_id)
        
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


@ebookuploader_bp.route('/view/<int:ebook_id>', methods=['GET'])
@jwt_required()
def view(ebook_id):
    try:
        user_id = get_jwt_identity()
        
        user = Users.query.get(user_id)
        user_role = 'user'
        if user and user.user_role_id:
            role = Roles.query.get(user.user_role_id)
            user_role = role.role_code if role else 'user'
        
        query = EbookUploader.query.filter(EbookUploader.id == ebook_id)
        
        if user_role != 'admin' and user_role != 'super_admin':
            query = query.filter(EbookUploader.user_id == user_id)
        
        record = query.first()
        if not record:
            return jsonify({'success': False, 'error': 'Ebook not found'}), 404
        
        return jsonify({'success': True, 'data': record.to_dict()})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@ebookuploader_bp.route('/create', methods=['POST'])
@jwt_required()
def create():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        ebook = EbookUploader(
            book=data.get('book'),
            user_id=user_id,
            final_copy=data.get('final_copy'),
            readium_manifest=data.get('readium_manifest'),
            date_uploaded=datetime.utcnow(),
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
        
        return jsonify({'success': True, 'data': {'id': ebook.id}, 'message': 'Ebook uploaded'}), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@ebookuploader_bp.route('/add', methods=['POST'])
@jwt_required()
def add():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        user = Users.query.get(user_id)
        user_role = 'user'
        if user and user.user_role_id:
            role = Roles.query.get(user.user_role_id)
            user_role = role.role_code if role else 'user'
        
        effective_user_id = data.get('user_id', user_id)
        
        if not effective_user_id:
            return jsonify({'success': False, 'error': 'User ID required'}), 400
        
        ebook = EbookUploader(
            book=data.get('book'),
            user_id=effective_user_id,
            final_copy=data.get('final_copy'),
            readium_manifest=data.get('readium_manifest'),
            date_uploaded=datetime.utcnow(),
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
        
        return jsonify({'success': True, 'data': {'id': ebook.id}, 'message': 'Ebook uploaded'}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@ebookuploader_bp.route('/edit/<int:ebook_id>', methods=['POST'])
@jwt_required()
def edit(ebook_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        user = Users.query.get(user_id)
        user_role = 'user'
        if user and user.user_role_id:
            role = Roles.query.get(user.user_role_id)
            user_role = role.role_code if role else 'user'
        
        if user_role != 'admin' and user_role != 'super_admin':
            existing = EbookUploader.query.filter_by(id=ebook_id, user_id=user_id).first()
            if not existing:
                return jsonify({'success': False, 'error': 'Ebook not found or access denied'}), 404
        
        ebook = EbookUploader.query.get(ebook_id)
        if not ebook:
            return jsonify({'success': False, 'error': 'Ebook not found'}), 404
        
        for key in ['book', 'final_copy', 'readium_manifest', 'payment_status', 'payment_id', 'status', 'book_title', 'isbn', 'author', 'cover_image']:
            if key in data:
                setattr(ebook, key, data[key])
        
        db.session.commit()
        
        return jsonify({'success': True, 'data': {'id': ebook.id}, 'message': 'Ebook updated'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@ebookuploader_bp.route('/delete/<int:ebook_id>', methods=['GET'])
@jwt_required()
def delete(ebook_id):
    try:
        user_id = get_jwt_identity()
        
        user = Users.query.get(user_id)
        user_role = 'user'
        if user and user.user_role_id:
            role = Roles.query.get(user.user_role_id)
            user_role = role.role_code if role else 'user'
        
        if user_role != 'admin' and user_role != 'super_admin':
            EbookUploader.query.filter_by(id=ebook_id, user_id=user_id).delete()
        else:
            EbookUploader.query.filter_by(id=ebook_id).delete()
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Ebook(s) deleted'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@ebookuploader_bp.route('/upload/<fieldname>', methods=['POST'])
@jwt_required()
def upload_file(fieldname):
    try:
        if 'files' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400
        
        file = request.files['files']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        
        import os
        from werkzeug.utils import secure_filename
        
        upload_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'assets', 'uploads', 'files', 'ebook')
        os.makedirs(upload_folder, exist_ok=True)
        
        filename = secure_filename(file.filename)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        return jsonify({'success': True, 'data': f'uploads/files/ebook/{filename}'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500