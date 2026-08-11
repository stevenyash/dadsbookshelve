from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from functools import wraps
from datetime import datetime
from src.models import Users, Roles, PermissionModules, PermissionActions, RolePermissions, UserCustomPermissions

PUBLIC_PATHS = [
    # Auth
    '/auth', '/auth/login', '/auth/register', '/auth/me', '/auth/forgotpassword',
    '/auth/reset-password',
    # Permissions API (public for OPTIONS preflight)
    '/roles', '/roles/', '/roles/permissions', '/roles/permissions/',
    '/permission_modules', '/permission_modules/', '/permission_actions', '/permission_actions/',
    '/role_permissions', '/role_permissions/', '/user_custom_permissions', '/user_custom_permissions/',
    # API public paths
    '/books', '/books/index', '/books/view', '/books/shop', '/books/download',
    '/genres', '/genres/index', '/genres/view',
    '/components_data', '/components_data/libraryaccess',
    '/fileuploader', '/publish', '/ebook', '/ebookpricing',
    '/dbslibrary', '/sellbooks', '/limitless', '/dbspricelist', '/donation',
    '/about_limitless', '/archive', '/signin', '/getinvolved',
    '/privacy', '/terms', 
    '/consents/add', '/currentsliders', '/donations/add', '/featuredbooks',
    '/libraryaccess', '/newslettersubscriptions/add', 
    '/ebookuploader/add', '/ebookuploader/edit', '/ebookuploader/view',
    '/ebook-conversion', 
    '/user-home', '/dashboard', '/mainlibrary', '/userdevices/register',
    '/campaigns/validate', '/affiliatelinks/track', '/stories/clientblog', '/home',
    '/sliders', '/health', '/googlecallback',
    '/home'
]


def is_public_path(path: str) -> bool:
    if not path or path == '/':
        return True
    normalized = path.replace('/api/', '/') if path.startswith('/api/') else path
    segments = normalized.split('/')
    base = segments[0] if segments else ''
    return any(normalized.startswith(p) or p == base for p in PUBLIC_PATHS)


def optional_auth(f):
    """Optional authentication - sets user if token present, continues without error"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if is_public_path(request.path):
            return f(*args, **kwargs)
        
        try:
            verify_jwt_in_request(optional=True)
            identity = get_jwt_identity()
            if identity:
                from src.app import db
                user = Users.query.get(identity)
                if user:
                    request.current_user = user
        except:
            pass
        
        return f(*args, **kwargs)
    return decorated


def require_auth(f):
    """Require authentication - returns 401 if no valid token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Handle OPTIONS preflight
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        
        if is_public_path(request.path):
            return f(*args, **kwargs)
        
        try:
            verify_jwt_in_request()
            identity = get_jwt_identity()
            if not identity:
                return jsonify({'success': False, 'error': 'Authentication required'}), 401
            
            from src.app import db
            from src.models import Roles
            user = Users.query.filter_by(user_id=int(identity)).first()
            if not user:
                return jsonify({'success': False, 'error': 'User not found'}), 404
            
            # Pre-load role to avoid lazy loading issues
            if user.user_role_id:
                user._loaded_role = Roles.query.filter_by(role_id=user.user_role_id).first()
            
            request.current_user = user
        except Exception as e:
            print(f"Auth error: {e}")
            return jsonify({'success': False, 'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated


def require_role(*allowed_role_ids):
    """Require specific role(s)"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'current_user') or not request.current_user:
                return jsonify({'success': False, 'error': 'Authentication required'}), 401
            
            user_role_id = request.current_user.user_role_id
            if user_role_id not in allowed_role_ids:
                return jsonify({'success': False, 'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator


def check_permission(module_code: str, action_code: str = 'VIEW'):
    """Check if user has permission for a module/action"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'current_user') or not request.current_user:
                return jsonify({'success': False, 'error': 'Authentication required'}), 401
            
            from src.app import db
            user = request.current_user
            user_role_id = user.user_role_id
            
            if not user_role_id:
                return jsonify({'success': False, 'error': 'No role assigned'}), 403
            
            module = PermissionModules.query.filter_by(module_code=module_code).first()
            if not module:
                return jsonify({'success': False, 'error': 'Module not found'}), 403
            
            action = PermissionActions.query.filter_by(action_code=action_code.upper()).first()
            if not action:
                return jsonify({'success': False, 'error': 'Action not found'}), 403
            
            role_perm = RolePermissions.query.filter_by(
                role_id=user_role_id,
                module_id=module.module_id,
                action_id=action.action_id
            ).first()
            
            if role_perm and role_perm.is_granted:
                return f(*args, **kwargs)
            
            custom_perm = UserCustomPermissions.query.filter_by(
                user_id=user.user_id,
                module_id=module.module_id,
                action_id=action.action_id
            ).first()
            
            if custom_perm and custom_perm.is_granted:
                return f(*args, **kwargs)
            
            return jsonify({'success': False, 'error': f'Permission denied: {module_code}/{action_code}'}), 403
        
        return decorated
    return decorator


def require_admin(f):
    """Require admin role"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(request, 'current_user') or not request.current_user:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        from src.app import db
        from src.models import Roles
        user = request.current_user
        
        if not user.user_role_id:
            return jsonify({'success': False, 'error': 'No role assigned'}), 403
        
        role = Roles.query.filter_by(role_id=user.user_role_id).first()
        
        if not role or role.role_code not in ('admin', 'super_admin'):
            return jsonify({'success': False, 'error': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    return decorated
