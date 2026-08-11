from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth
from src.models import db, Readinghistory, Devices, UserDevices

readinghistory_bp = Blueprint('readinghistory', __name__)


@readinghistory_bp.route('/index', methods=['GET'])
@require_auth
def index():
    user_id = request.args.get('user_id', type=int) or get_jwt_identity()
    query = Readinghistory.query.filter_by(user_id=user_id)
    
    history = query.order_by(Readinghistory.created_at.desc()).all()
    return jsonify({
        'success': True,
        'records': [{'id': h.id, 'book_id': h.book_id, 'status': h.status, 'progress': h.progress, 'rating': h.rating, 'currentChapter': h.currentChapter, 'created_at': h.created_at.isoformat() if h.created_at else None} for h in history]
    })


@readinghistory_bp.route('/view/<int:id>', methods=['GET'])
@require_auth
def view(id):
    history = Readinghistory.query.get(id)
    if not history:
        return jsonify({'success': False, 'error': 'History not found'}), 404
    return jsonify({'success': True, 'record': {'id': history.id, 'book_id': history.book_id, 'status': history.status, 'progress': history.progress}})


@readinghistory_bp.route('/add', methods=['POST'])
@require_auth
def add():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    history = Readinghistory(
        user_id=user_id,
        device_id=data.get('device_id'),
        book_id=data.get('book_id'),
        status=data.get('status', 'reading'),
        currentChapter=data.get('currentChapter', 0),
        progress=data.get('progress', 0),
        totalChapters=data.get('totalChapters', 0)
    )
    db.session.add(history)
    db.session.commit()
    return jsonify({'success': True, 'record': {'id': history.id}})


@readinghistory_bp.route('/edit/<int:id>', methods=['PUT'])
@require_auth
def edit(id):
    history = Readinghistory.query.get(id)
    if not history:
        return jsonify({'success': False, 'error': 'History not found'}), 404
    data = request.get_json()
    for key in ['status', 'currentChapter', 'progress', 'rating', 'notes', 'end_date']:
        if key in data:
            setattr(history, key, data[key])
    db.session.commit()
    return jsonify({'success': True})


@readinghistory_bp.route('/by-book/<int:book_id>', methods=['GET'])
@require_auth
def by_book(book_id):
    user_id = get_jwt_identity()
    history = Readinghistory.query.filter_by(user_id=user_id, book_id=book_id).first()
    if not history:
        return jsonify({'success': False, 'error': 'No reading history found'}), 404
    return jsonify({'success': True, 'record': {'id': history.id, 'progress': history.progress, 'currentChapter': history.currentChapter}})


# Devices
devices_bp = Blueprint('devices', __name__)


@devices_bp.route('/index', methods=['GET'])
@require_auth
def index():
    user_id = request.args.get('user_id', type=int)
    query = Devices.query
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    devices = query.all()
    return jsonify({
        'success': True,
        'records': [{'id': d.id, 'device_id': d.device_id, 'platform': d.platform, 'is_secure': d.is_secure, 'device_name': d.device_name} for d in devices]
    })


@devices_bp.route('/register', methods=['POST'])
@require_auth
def register():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    device = Devices(
        user_id=user_id,
        device_id=data.get('device_id'),
        platform=data.get('platform'),
        device_name=data.get('device_name'),
        is_rooted=data.get('is_rooted', False),
        is_jailbroken=data.get('is_jailbroken', False),
        security_status=data.get('security_status'),
        public_key_spki=data.get('public_key_spki')
    )
    db.session.add(device)
    db.session.flush()
    
    user_device = UserDevices(user_id=user_id, device_id=device.id, is_active=True)
    db.session.add(user_device)
    db.session.commit()
    
    return jsonify({'success': True, 'record': {'id': device.id}})


@devices_bp.route('/view/<int:device_id>', methods=['GET'])
@require_auth
def view(device_id):
    device = Devices.query.get(device_id)
    if not device:
        return jsonify({'success': False, 'error': 'Device not found'}), 404
    return jsonify({'success': True, 'record': {'id': device.id, 'platform': device.platform, 'device_name': device.device_name}})


@devices_bp.route('/edit/<int:device_id>', methods=['PUT'])
@require_auth
def edit(device_id):
    device = Devices.query.get(device_id)
    if not device:
        return jsonify({'success': False, 'error': 'Device not found'}), 404
    data = request.get_json()
    for key in ['device_name', 'public_key_spki']:
        if key in data:
            setattr(device, key, data[key])
    db.session.commit()
    return jsonify({'success': True})


# User Devices
userdevices_bp = Blueprint('userdevices', __name__)


@userdevices_bp.route('/index', methods=['GET'])
@require_auth
def index():
    user_id = request.args.get('user_id', type=int) or get_jwt_identity()
    user_devices = UserDevices.query.filter_by(user_id=user_id, is_active=True).all()
    return jsonify({
        'success': True,
        'records': [{'id': u.id, 'device_id': u.device_id, 'is_active': u.is_active} for u in user_devices]
    })


@userdevices_bp.route('/deactivate', methods=['POST'])
@require_auth
def deactivate():
    user_id = get_jwt_identity()
    data = request.get_json()
    device_id = data.get('device_id')
    
    user_device = UserDevices.query.filter_by(user_id=user_id, device_id=device_id).first()
    if user_device:
        user_device.is_active = False
        db.session.commit()
    
    return jsonify({'success': True, 'message': 'Device deactivated'})
