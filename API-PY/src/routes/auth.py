import os
import secrets
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
import bcrypt
from datetime import datetime, timedelta
from src.middleware.auth import require_auth
from src.models import db, Users, Roles, Clients, PermissionModules, PermissionActions, RolePermissions, UserCustomPermissions
from src.services.email import email_service

auth_bp = Blueprint('auth', __name__)


def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def normalize_referral_code(value) -> str:
    if not value:
        return ''
    return str(value).strip()


def get_referral_code_from_data(data: dict) -> str:
    return normalize_referral_code(
        data.get('referral_code') or data.get('referralCode')
    )


def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30


def get_user_permissions(user_id, role_id):
    """Build permission matrix from role + custom permissions"""
    permissions = {}
    
    if not role_id:
        return permissions
    
    # Super admin and admin get all permissions
    if role_id in [1, 2]:
        all_modules = PermissionModules.query.all()
        all_actions = PermissionActions.query.all()
        for module in all_modules:
            permissions[module.module_code] = [a.action_code.upper() for a in all_actions]
        return permissions
    
    role_perms = RolePermissions.query.filter_by(role_id=role_id).all()
    for rp in role_perms:
        module = PermissionModules.query.filter_by(module_id=rp.module_id).first()
        action = PermissionActions.query.filter_by(action_id=rp.action_id).first()
        if module and action and rp.is_granted:
            if module.module_code not in permissions:
                permissions[module.module_code] = []
            action_code = action.action_code.upper() if action.action_code else None
            if action_code and action_code not in permissions[module.module_code]:
                permissions[module.module_code].append(action_code)
    
    custom_perms = UserCustomPermissions.query.filter(
        UserCustomPermissions.user_id == user_id,
        (UserCustomPermissions.expires_at == None) | (UserCustomPermissions.expires_at > datetime.utcnow())
    ).all()
    
    for cp in custom_perms:
        module = PermissionModules.query.filter_by(module_id=cp.module_id).first()
        action = PermissionActions.query.filter_by(action_id=cp.action_id).first()
        if module and action:
            action_code = action.action_code.upper() if action.action_code else None
            if module.module_code not in permissions:
                permissions[module.module_code] = []
            if cp.is_granted and action_code and action_code not in permissions[module.module_code]:
                permissions[module.module_code].append(action_code)
            elif not cp.is_granted and action_code and action_code in permissions.get(module.module_code, []):
                permissions[module.module_code].remove(action_code)
    
    return permissions


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    identifier = data.get('email') or data.get('username')
    password = data.get('password')

    user = Users.query.filter_by(email=identifier).first()
    if not user:
        user = Users.query.filter_by(name=identifier).first()

    if user and verify_password(password, user.password):
        if user.account_status == 'deleted':
            return jsonify({'success': False, 'error': 'Account not found'}), 404

        referral_code = get_referral_code_from_data(data)
        if referral_code and referral_code.startswith('AMB') and not user.b2h_referral_code:
            user.b2h_referral_code = referral_code
            db.session.commit()

        additional_claims = {
            'user_id': user.user_id,
            'email': user.email,
            'role_id': user.user_role_id,
            'name': user.name
        }
        token = create_access_token(
            identity=str(user.user_id),
            additional_claims=additional_claims,
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token = create_refresh_token(
            identity=str(user.user_id),
            expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        )

        role = Roles.query.get(user.user_role_id) if user.user_role_id else None

        return jsonify({
            'success': True,
            'data': {
                'token': token,
                'refreshToken': refresh_token,
                'expires_in': ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                'user': {
                    'user_id': user.user_id,
                    'email': user.email,
                    'name': user.name,
                    'role_id': user.user_role_id,
                    'role_code': role.role_code if role else None,
                    'role_name': role.role_name if role else None,
                }
            }
        })

    return jsonify({
        'success': False,
        'message': 'Invalid credentials'
    }), 401


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    additional_claims = {'user_id': identity}
    access_token = create_access_token(
        identity=identity,
        additional_claims=additional_claims,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jsonify({
        'success': True,
        'data': {
            'token': access_token,
            'expires_in': ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    })


@auth_bp.route('/refresh-token', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Refresh access token using refresh token"""
    identity = get_jwt_identity()
    additional_claims = {'user_id': identity}
    access_token = create_access_token(
        identity=identity,
        additional_claims=additional_claims,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jsonify({
        'success': True,
        'data': {
            'token': access_token,
            'expires_in': ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    })


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    existing = Users.query.filter_by(email=data.get('email')).first()
    if existing:
        return jsonify({'success': False, 'error': 'Email already registered'}), 400
    
    user = Users(
        name=data.get('name'),
        email=data.get('email'),
        password=hash_password(data.get('password')),
        telephone=data.get('telephone'),
        country_code=data.get('country_code')
    )
    
    db.session.add(user)
    db.session.flush()

    referral_code = get_referral_code_from_data(data)
    if referral_code and referral_code.startswith('AMB'):
        user.b2h_referral_code = referral_code

    db.session.commit()

    additional_claims = {
        'user_id': user.user_id,
        'email': user.email,
        'role_id': user.user_role_id,
        'name': user.name
    }
    token = create_access_token(
        identity=str(user.user_id),
        additional_claims=additional_claims
    )

    return jsonify({
        'success': True,
        'data': {
            'token': token,
            'user': user.to_dict(),
            'message': 'Registration successful'
        }
    })


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = Users.query.filter_by(user_id=int(user_id)).first()
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    permissions = get_user_permissions(user.user_id, user.user_role_id)
    
    custom_perms_list = []
    custom_perms = UserCustomPermissions.query.filter(
        UserCustomPermissions.user_id == user.user_id,
        (UserCustomPermissions.expires_at == None) | (UserCustomPermissions.expires_at > datetime.utcnow())
    ).all()
    
    for cp in custom_perms:
        module = PermissionModules.query.filter_by(module_id=cp.module_id).first()
        action = PermissionActions.query.filter_by(action_id=cp.action_id).first()
        if module and action:
            custom_perms_list.append({
                'module_code': module.module_code,
                'module_name': module.module_name,
                'action_code': action.action_code.upper() if action.action_code else None,
                'action_name': action.action_name,
                'is_granted': cp.is_granted,
                'expires_at': cp.expires_at.isoformat() if cp.expires_at else None,
                'granted_by': cp.granted_by,
            })
    
    is_profile_complete = bool(user.name and user.telephone and user.country_code and user.national_id)

    return jsonify({
        'success': True,
        'data': {
            'user': {
                'user_id': user.user_id,
                'email': user.email,
                'name': user.name,
                'telephone': user.telephone,
                'country_code': user.country_code,
                'national_id': user.national_id,
                'is_active': user.account_status == 'active',
                'is_profile_complete': is_profile_complete,
                'role_id': user.user_role_id,
                'role_code': user.role.role_code if user.role else None,
                'role_name': user.role.role_name if user.role else None,
                'permissions': permissions,
                'custom_permissions': custom_perms_list,
            }
        }
    })


@auth_bp.route('/forgotpassword', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    user = Users.query.filter_by(email=email).first()
    if not user:
        return jsonify({'success': True, 'message': 'If email exists, reset link will be sent'})
    
    # Generate reset token with expiry (24 hours)
    expiry = datetime.utcnow() + timedelta(hours=24)
    token_data = f"{user.user_id}:{expiry.timestamp()}"
    reset_token = secrets.token_urlsafe(32)
    
    # Store token and expiry in user record
    user.reset_token = reset_token
    user.reset_token_expires = expiry
    db.session.commit()
    
    # Build reset link
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    reset_link = f"{frontend_url}/resetpassword?token={reset_token}&email={email}"
    
    # Send email
    html = f'''
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Hello {user.name},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="margin: 20px 0;">
            <a href="{reset_link}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
            </a>
        </p>
        <p>Or copy and paste this link: <br>{reset_link}</p>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <br>
        <p>Best regards,<br>DADS Bookshelves Team</p>
    </body>
    </html>
    '''
    email_service.send_email(email, 'Password Reset - DADS Bookshelves', html)
    
    return jsonify({'success': True, 'message': 'Password reset link sent to your email'})


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    email = data.get('email')
    new_password = data.get('new_password')
    
    if not token or not email or not new_password:
        return jsonify({'success': False, 'error': 'Token, email and new password are required'}), 400
    
    user = Users.query.filter_by(email=email, reset_token=token).first()
    
    if not user:
        return jsonify({'success': False, 'error': 'Invalid token or email'}), 400
    
    if user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
        return jsonify({'success': False, 'error': 'Token has expired'}), 400
    
    # Update password and clear reset token
    user.password = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Password reset successful'})


@auth_bp.route('/edit', methods=['PUT'])
@jwt_required()
def edit_profile():
    data = request.get_json()
    user_id = get_jwt_identity()
    user = Users.query.filter_by(user_id=int(user_id)).first()
    
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    
    # Fields user can edit themselves
    if 'name' in data:
        user.name = data['name']
    if 'telephone' in data:
        user.telephone = data['telephone']
    if 'country_code' in data:
        user.country_code = data['country_code']
    if 'national_id' in data:
        user.national_id = data['national_id']
    
    # Sensitive fields - only admin can change these
    # These are handled separately via admin endpoints
    
    user.date_updated = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'data': {
            'user_id': user.user_id,
            'email': user.email,
            'name': user.name,
            'telephone': user.telephone,
            'country_code': user.country_code,
            'date_updated': user.date_updated.isoformat()
        },
        'message': 'Profile updated successfully'
    })


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    data = request.get_json()
    user_id = get_jwt_identity()
    user = Users.query.filter_by(user_id=int(user_id)).first()
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not verify_password(current_password, user.password):
        return jsonify({'success': False, 'error': 'Current password is incorrect'}), 400
    
    user.password = hash_password(new_password)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Password changed successfully'})


@auth_bp.route('/clients/add', methods=['POST'])
def clients_add():
    """Register new client - creates both Users and Clients records"""
    data = request.get_json()
    
    # Check if user already exists
    existing = Users.query.filter_by(email=data.get('email')).first()
    if existing:
        return jsonify({'success': False, 'error': 'Email already registered'}), 400
    
    # Create user
    user = Users(
        name=data.get('name'),
        email=data.get('email'),
        password=hash_password(data.get('password')),
        telephone=data.get('telephone'),
        country_code=data.get('country_code')
    )
    db.session.add(user)
    db.session.flush()  # Get user_id
    
    # Handle referral code if provided (B2H-only)
    referral_code = get_referral_code_from_data(data)
    if referral_code and referral_code.startswith('AMB'):
        user.b2h_referral_code = referral_code

    # Create client profile
    client = Clients(
        user_id=user.user_id,
        name=data.get('name'),
        email=data.get('email'),
        telephone=data.get('telephone')
    )
    db.session.add(client)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Registration successful',
        'data': {
            'user_id': user.user_id,
            'client_id': client.id
        }
    })
