from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from src.middleware.auth import require_auth, require_admin
from src.models import db, Users, Roles, Clients

users_bp = Blueprint('users', __name__)


@users_bp.route('', methods=['GET'])
@users_bp.route('/', methods=['GET'])
@require_auth
def list_users():
    """List users - same as /index"""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    search = request.args.get('search', '')
    
    query = Users.query
    
    if search:
        query = query.filter(
            (Users.name.ilike(f'%{search}%')) |
            (Users.email.ilike(f'%{search}%'))
        )
    
    total = query.count()
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    users = query.offset((page - 1) * limit).limit(limit).all()
    
    return jsonify({
        'success': True,
        'records': [u.to_dict() for u in users],
        'total': total,
        'page': page,
        'limit': limit,
        'totalPages': total_pages
    })


@users_bp.route('/index', methods=['GET'])
@require_auth
def index():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    search = request.args.get('search', '')
    
    query = Users.query
    
    if search:
        query = query.filter(
            (Users.name.ilike(f'%{search}%')) |
            (Users.email.ilike(f'%{search}%'))
        )
    
    total = query.count()
    users = query.offset((page - 1) * limit).limit(limit).all()
    
    return jsonify({
        'success': True,
        'records': [u.to_dict() for u in users],
        'total': total,
        'page': page,
        'limit': limit
    })


@users_bp.route('/view/<int:user_id>', methods=['GET'])
@require_auth
def view(user_id):
    user = Users.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    return jsonify({
        'success': True,
        'record': user.to_dict()
    })


@users_bp.route('/add', methods=['POST'])
@require_auth
def add():
    data = request.get_json()
    
    existing = Users.query.filter_by(email=data.get('email')).first()
    if existing:
        return jsonify({'success': False, 'error': 'Email already exists'}), 400
    
    user = Users(
        name=data.get('name'),
        email=data.get('email'),
        password=generate_password_hash(data.get('password')),
        telephone=data.get('telephone'),
        user_role_id=data.get('user_role_id'),
        country_code=data.get('country_code')
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': user.to_dict(),
        'message': 'User added successfully'
    })


@users_bp.route('/edit/<int:user_id>', methods=['PUT'])
@require_auth
def edit(user_id):
    user = Users.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if 'name' in data:
        user.name = data['name']
    if 'telephone' in data:
        user.telephone = data['telephone']
    if 'user_role_id' in data:
        user.user_role_id = data['user_role_id']
    if 'country_code' in data:
        user.country_code = data['country_code']
    if 'account_status' in data:
        user.account_status = data['account_status']
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': user.to_dict(),
        'message': 'User updated successfully'
    })


@users_bp.route('/delete/<int:user_id>', methods=['DELETE'])
@require_auth
@require_admin
def delete(user_id):
    user = Users.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    user.account_status = 'deleted'
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'User deleted successfully'
    })


@users_bp.route('/batch-delete', methods=['POST'])
@require_auth
@require_admin
def batch_delete():
    """Delete multiple users by IDs"""
    data = request.get_json()
    ids = data.get('ids', [])
    
    if not ids:
        return jsonify({'success': False, 'error': 'No user IDs provided'}), 400
    
    users = Users.query.filter(Users.user_id.in_(ids)).all()
    for user in users:
        user.account_status = 'deleted'
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'{len(users)} users deleted successfully'
    })


@users_bp.route('/changepassword', methods=['POST'])
@require_auth
def change_password():
    current_user_id = get_jwt_identity()
    user = Users.query.get(current_user_id)
    
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not check_password_hash(user.password, current_password):
        return jsonify({'success': False, 'error': 'Current password is incorrect'}), 400
    
    user.password = generate_password_hash(new_password)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Password changed successfully'
    })


@users_bp.route('/roles-list', methods=['GET'])
@require_auth
def roles_list():
    roles = Roles.query.filter_by(is_active=True).order_by(Roles.sort_order).all()
    return jsonify({
        'success': True,
        'records': [r.to_dict() for r in roles]
    })


@users_bp.route('/updateprofile', methods=['PUT'])
@require_auth
def update_profile():
    current_user_id = get_jwt_identity()
    user = Users.query.get(current_user_id)
    
    data = request.get_json()
    
    if 'name' in data:
        user.name = data['name']
    if 'telephone' in data:
        user.telephone = data['telephone']
    if 'country_code' in data:
        user.country_code = data['country_code']
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'record': user.to_dict(),
        'message': 'Profile updated successfully'
    })
