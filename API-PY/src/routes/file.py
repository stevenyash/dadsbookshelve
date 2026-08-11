from flask import Blueprint, request, jsonify, send_from_directory, current_app
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime
from src.helpers.uploader import app_config, upload_config

file_bp = Blueprint('file', __name__)

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
ALLOWED_BOOK_EXTENSIONS = {'pdf', 'epub', 'mobi'}


def allowed_file(filename, allowed_exts):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_exts


def get_upload_settings(fieldname):
    return upload_config.get(fieldname, upload_config.get('image_url'))


@file_bp.route('/upload/<fieldname>', methods=['POST'])
def upload_file(fieldname):
    try:
        if 'files' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400
        
        files = request.files.getlist('files')
        if not files or files[0].filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        
        settings = get_upload_settings(fieldname)
        allowed_exts = set(settings.get('extensions', '').split(','))
        
        uploaded_paths = []
        
        for file in files:
            if file:
                filename = secure_filename(file.filename)
                ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
                
                if ext not in allowed_exts:
                    return jsonify({'success': False, 'message': f'File extension {ext} not allowed'}), 400
                
                filename_type = settings.get('filenameType', 'random')
                if filename_type == 'random':
                    new_filename = f"{uuid.uuid4().hex}.{ext}"
                elif filename_type == 'date':
                    new_filename = datetime.now().strftime('%Y-%m-%d-%H-%M-%S') + f".{ext}"
                elif filename_type == 'timestamp':
                    new_filename = f"{int(datetime.now().timestamp())}.{ext}"
                elif filename_type == 'original':
                    new_filename = filename
                else:
                    new_filename = f"{uuid.uuid4().hex}.{ext}"
                
                prefix = settings.get('filenamePrefix', '')
                if prefix:
                    new_filename = prefix + new_filename
                
                upload_dir = os.path.join(app_config.public_dir, settings.get('uploadDir', 'uploads/files'))
                os.makedirs(upload_dir, exist_ok=True)
                
                filepath = os.path.join(upload_dir, new_filename)
                file.save(filepath)
                
                relative_path = os.path.join(settings.get('uploadDir', 'uploads/files'), new_filename).replace('\\', '/')
                file_url = f"{app_config.url}/{relative_path}"
                
                uploaded_paths.append({
                    'filepath': relative_path,
                    'fileurl': file_url,
                    'filename': new_filename,
                })
        
        if len(uploaded_paths) == 1:
            return jsonify({'success': True, 'data': uploaded_paths[0]['fileurl']})
        else:
            return jsonify({'success': True, 'data': [p['fileurl'] for p in uploaded_paths]})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@file_bp.route('/remove_temp_file', methods=['POST'])
def remove_temp_file():
    try:
        data = request.get_json()
        temp_file = data.get('temp_file')
        
        if temp_file:
            temp_path = os.path.join(app_config.public_dir, 'uploads', 'temp', os.path.basename(temp_file))
            if os.path.exists(temp_path):
                os.remove(temp_path)
                return jsonify({'success': True, 'message': 'File deleted'})
        
        return jsonify({'success': False, 'message': 'Invalid temp file'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@file_bp.route('/uploads/<path:filename>')
def serve_upload(filename):
    try:
        upload_dir = os.path.join(app_config.public_dir, 'uploads')
        return send_from_directory(upload_dir, filename)
    except Exception:
        return jsonify({'success': False, 'error': 'File not found'}), 404


@file_bp.route('/files/<path:filename>')
def serve_file(filename):
    try:
        files_dir = os.path.join(app_config.public_dir, 'uploads', 'files')
        return send_from_directory(files_dir, filename)
    except Exception:
        return jsonify({'success': False, 'error': 'File not found'}), 404