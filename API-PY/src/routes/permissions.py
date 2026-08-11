from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth
from src.models import db, Roles, RolePermissions, PermissionModules, PermissionActions, UserCustomPermissions, Users
import logging
from datetime import datetime, timedelta
from sqlalchemy import or_

logger = logging.getLogger(__name__)

perm_roles_bp = Blueprint('perm_roles_bp', __name__)


@perm_roles_bp.route('')
def index():
    """Get all roles with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Validate pagination parameters
        if page < 1:
            page = 1
        if per_page < 1 or per_page > 100:
            per_page = 20
        
        pagination = Roles.query.paginate(page=page, per_page=per_page, error_out=False)
        
        logger.info('Roles endpoint called, found %d roles', pagination.total)
        
        return jsonify({
            'success': True,
            'records': [{
                'role_id': r.role_id, 
                'role_name': r.role_name, 
                'role_code': r.role_code, 
                'description': r.description
            } for r in pagination.items],
            'pagination': {
                'page': pagination.page,
                'pages': pagination.pages,
                'total': pagination.total,
                'per_page': pagination.per_page,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
    except Exception as e:
        logger.error(f"Error fetching roles: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@perm_roles_bp.route('/view/<int:role_id>', methods=['GET'])
@require_auth
def view(role_id):
    """Get a single role by ID"""
    try:
        role = Roles.query.get(role_id)
        if not role:
            return jsonify({'success': False, 'error': 'Role not found'}), 404
        
        # Get permissions for this role
        permissions = RolePermissions.query.filter_by(role_id=role_id).all()
        
        return jsonify({
            'success': True, 
            'record': {
                'role_id': role.role_id, 
                'role_name': role.role_name, 
                'role_code': role.role_code,
                'description': role.description,
                'created_at': role.created_at.isoformat() if hasattr(role, 'created_at') and role.created_at else None,
                'permissions_count': len(permissions)
            }
        })
    except Exception as e:
        logger.error(f"Error viewing role {role_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@perm_roles_bp.route('/permissions/<int:role_id>', methods=['GET', 'POST', 'OPTIONS'])
def role_permissions(role_id):
    """Get or update role permissions"""
    if request.method == 'OPTIONS':
        return jsonify({'success': True})
    
    try:
        if request.method == 'GET':
            # Get permissions for this role
            perms = RolePermissions.query.filter_by(role_id=role_id).all()
            return jsonify({
                'success': True,
                'records': [{
                    'role_id': p.role_id,
                    'module_id': p.module_id,
                    'action_id': p.action_id,
                    'is_granted': p.is_granted
                } for p in perms]
            })
        
        if request.method == 'POST':
            # Update role permissions (batch)
            data = request.get_json()
            permissions = data.get('permissions', [])
            
            # Remove existing permissions for this role
            RolePermissions.query.filter_by(role_id=role_id).delete()
            
            # Add new permissions
            for perm in permissions:
                role_perm = RolePermissions(
                    role_id=role_id,
                    module_id=perm.get('module_id'),
                    action_id=perm.get('action_id'),
                    is_granted=perm.get('is_granted', True)
                )
                db.session.add(role_perm)
            
            db.session.commit()
            return jsonify({'success': True, 'message': 'Permissions updated'})
        
        return jsonify({'success': False, 'error': 'Invalid method'}), 405
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error with role permissions {role_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@perm_roles_bp.route('/add', methods=['POST'])
@require_auth
def add():
    """Add a new role"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        role_name = data.get('role_name')
        role_code = data.get('role_code')
        
        if not role_name:
            return jsonify({'success': False, 'error': 'role_name is required'}), 400
        
        if not role_code:
            return jsonify({'success': False, 'error': 'role_code is required'}), 400
        
        # Check for duplicate role_code
        existing = Roles.query.filter_by(role_code=role_code).first()
        if existing:
            return jsonify({'success': False, 'error': 'Role code already exists'}), 409
        
        # Check for duplicate role_name
        existing_name = Roles.query.filter_by(role_name=role_name).first()
        if existing_name:
            return jsonify({'success': False, 'error': 'Role name already exists'}), 409
        
        role = Roles(
            role_name=role_name,
            role_code=role_code,
            description=data.get('description', '')
        )
        
        db.session.add(role)
        db.session.commit()
        
        logger.info(f"New role added: {role_code} by user {get_jwt_identity()}")
        
        return jsonify({
            'success': True, 
            'record': {'role_id': role.role_id},
            'message': 'Role created successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding role: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@perm_roles_bp.route('/edit/<int:role_id>', methods=['PUT'])
@require_auth
def edit(role_id):
    """Edit an existing role"""
    try:
        role = Roles.query.get(role_id)
        if not role:
            return jsonify({'success': False, 'error': 'Role not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Update fields with validation
        if 'role_name' in data:
            # Check for duplicate name (excluding current role)
            existing = Roles.query.filter(
                Roles.role_name == data['role_name'],
                Roles.role_id != role_id
            ).first()
            if existing:
                return jsonify({'success': False, 'error': 'Role name already exists'}), 409
            role.role_name = data['role_name']
        
        if 'role_code' in data:
            # Check for duplicate code (excluding current role)
            existing = Roles.query.filter(
                Roles.role_code == data['role_code'],
                Roles.role_id != role_id
            ).first()
            if existing:
                return jsonify({'success': False, 'error': 'Role code already exists'}), 409
            role.role_code = data['role_code']
        
        if 'description' in data:
            role.description = data['description']
        
        db.session.commit()
        
        logger.info(f"Role {role_id} updated by user {get_jwt_identity()}")
        
        return jsonify({
            'success': True,
            'message': 'Role updated successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error editing role {role_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@perm_roles_bp.route('/delete/<int:role_id>', methods=['DELETE'])
@require_auth
def delete(role_id):
    """Delete a role"""
    try:
        role = Roles.query.get(role_id)
        if not role:
            return jsonify({'success': False, 'error': 'Role not found'}), 404
        
        # Check for dependent records
        user_count = Users.query.filter_by(role_id=role_id).count()
        if user_count > 0:
            return jsonify({
                'success': False, 
                'error': f'Cannot delete role with {user_count} associated users. Reassign users first.'
            }), 409
        
        perm_count = RolePermissions.query.filter_by(role_id=role_id).count()
        if perm_count > 0:
            # Option 1: Prevent deletion
            return jsonify({
                'success': False, 
                'error': f'Cannot delete role with {perm_count} associated permissions. Remove permissions first.'
            }), 409
            
            # Option 2: Cascade delete (uncomment if preferred)
            # RolePermissions.query.filter_by(role_id=role_id).delete()
        
        db.session.delete(role)
        db.session.commit()
        
        logger.info(f"Role {role_id} ({role.role_code}) deleted by user {get_jwt_identity()}")
        
        return jsonify({
            'success': True,
            'message': 'Role deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting role {role_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


# Permission Modules
perm_modules_bp = Blueprint('permission_modules', __name__)


@perm_modules_bp.route('')
@perm_modules_bp.route('/index')
def modules_index():
    """Get all permission modules"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        query = PermissionModules.query
        
        # Search functionality
        search = request.args.get('search')
        if search:
            query = query.filter(
                or_(
                    PermissionModules.module_name.ilike(f'%{search}%'),
                    PermissionModules.module_code.ilike(f'%{search}%')
                )
            )
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'records': [{
                'module_id': m.module_id, 
                'module_name': m.module_name, 
                'module_code': m.module_code, 
                'description': m.description
            } for m in pagination.items],
            'pagination': {
                'page': pagination.page,
                'pages': pagination.pages,
                'total': pagination.total,
                'per_page': pagination.per_page
            }
        })
    except Exception as e:
        logger.error(f"Error fetching modules: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@perm_modules_bp.route('/add', methods=['POST'])
@require_auth
def add_module():
    """Add a new permission module"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        module_name = data.get('module_name')
        module_code = data.get('module_code')
        
        if not module_name:
            return jsonify({'success': False, 'error': 'module_name is required'}), 400
        
        if not module_code:
            return jsonify({'success': False, 'error': 'module_code is required'}), 400
        
        # Check for duplicates
        existing = PermissionModules.query.filter_by(module_code=module_code).first()
        if existing:
            return jsonify({'success': False, 'error': 'Module code already exists'}), 409
        
        module = PermissionModules(
            module_name=module_name,
            module_code=module_code,
            description=data.get('description', '')
        )
        
        db.session.add(module)
        db.session.commit()
        
        logger.info(f"New module added: {module_code}")
        
        return jsonify({
            'success': True, 
            'record': {'module_id': module.module_id},
            'message': 'Module created successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding module: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@perm_modules_bp.route('/edit/<int:module_id>', methods=['PUT'])
@require_auth
def edit_module(module_id):
    """Edit an existing module"""
    try:
        module = PermissionModules.query.get(module_id)
        if not module:
            return jsonify({'success': False, 'error': 'Module not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        if 'module_name' in data:
            module.module_name = data['module_name']
        if 'module_code' in data:
            # Check for duplicate code
            existing = PermissionModules.query.filter(
                PermissionModules.module_code == data['module_code'],
                PermissionModules.module_id != module_id
            ).first()
            if existing:
                return jsonify({'success': False, 'error': 'Module code already exists'}), 409
            module.module_code = data['module_code']
        if 'description' in data:
            module.description = data['description']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Module updated successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error editing module {module_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@perm_modules_bp.route('/delete/<int:module_id>', methods=['DELETE'])
@require_auth
def delete_module(module_id):
    """Delete a module"""
    try:
        module = PermissionModules.query.get(module_id)
        if not module:
            return jsonify({'success': False, 'error': 'Module not found'}), 404
        
        # Check for dependent permissions
        perm_count = RolePermissions.query.filter_by(module_id=module_id).count()
        if perm_count > 0:
            return jsonify({
                'success': False,
                'error': f'Cannot delete module with {perm_count} associated permissions'
            }), 409
        
        db.session.delete(module)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Module deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting module {module_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


# Permission Actions
perm_actions_bp = Blueprint('permission_actions', __name__)


@perm_actions_bp.route('')
@perm_actions_bp.route('/index')
def actions_index():
    """Get all permission actions"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        query = PermissionActions.query
        
        # Search functionality
        search = request.args.get('search')
        if search:
            query = query.filter(
                or_(
                    PermissionActions.action_name.ilike(f'%{search}%'),
                    PermissionActions.action_code.ilike(f'%{search}%')
                )
            )
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'records': [{
                'action_id': a.action_id, 
                'action_name': a.action_name, 
                'action_code': a.action_code, 
                'description': a.description
            } for a in pagination.items],
            'pagination': {
                'page': pagination.page,
                'pages': pagination.pages,
                'total': pagination.total,
                'per_page': pagination.per_page
            }
        })
    except Exception as e:
        logger.error(f"Error fetching actions: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@perm_actions_bp.route('/add', methods=['POST'])
@require_auth
def add_action():
    """Add a new permission action"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        action_name = data.get('action_name')
        action_code = data.get('action_code')
        
        if not action_name:
            return jsonify({'success': False, 'error': 'action_name is required'}), 400
        
        if not action_code:
            return jsonify({'success': False, 'error': 'action_code is required'}), 400
        
        # Check for duplicates
        existing = PermissionActions.query.filter_by(action_code=action_code).first()
        if existing:
            return jsonify({'success': False, 'error': 'Action code already exists'}), 409
        
        action = PermissionActions(
            action_name=action_name,
            action_code=action_code,
            description=data.get('description', '')
        )
        
        db.session.add(action)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'record': {'action_id': action.action_id},
            'message': 'Action created successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding action: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@perm_actions_bp.route('/edit/<int:action_id>', methods=['PUT'])
@require_auth
def edit_action(action_id):
    """Edit an existing action"""
    try:
        action = PermissionActions.query.get(action_id)
        if not action:
            return jsonify({'success': False, 'error': 'Action not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        if 'action_name' in data:
            action.action_name = data['action_name']
        if 'action_code' in data:
            existing = PermissionActions.query.filter(
                PermissionActions.action_code == data['action_code'],
                PermissionActions.action_id != action_id
            ).first()
            if existing:
                return jsonify({'success': False, 'error': 'Action code already exists'}), 409
            action.action_code = data['action_code']
        if 'description' in data:
            action.description = data['description']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Action updated successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error editing action {action_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@perm_actions_bp.route('/delete/<int:action_id>', methods=['DELETE'])
@require_auth
def delete_action(action_id):
    """Delete an action"""
    try:
        action = PermissionActions.query.get(action_id)
        if not action:
            return jsonify({'success': False, 'error': 'Action not found'}), 404
        
        # Check for dependent permissions
        perm_count = RolePermissions.query.filter_by(action_id=action_id).count()
        if perm_count > 0:
            return jsonify({
                'success': False,
                'error': f'Cannot delete action with {perm_count} associated permissions'
            }), 409
        
        db.session.delete(action)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Action deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting action {action_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


# Role Permissions
role_perms_bp = Blueprint('role_permissions', __name__)


@role_perms_bp.route('')
@role_perms_bp.route('/index')
def role_perms_index():
    """Get role permissions with filters"""
    try:
        role_id = request.args.get('role_id', type=int)
        module_id = request.args.get('module_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        query = RolePermissions.query
        
        if role_id:
            query = query.filter_by(role_id=role_id)
        if module_id:
            query = query.filter_by(module_id=module_id)
        
        # Join with related tables for better data
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Get related data
        result = []
        for p in pagination.items:
            result.append({
                'id': p.id,
                'role_id': p.role_id,
                'role_name': p.role.role_name if p.role else None,
                'module_id': p.module_id,
                'module_name': p.module.module_name if p.module else None,
                'action_id': p.action_id,
                'action_name': p.action.action_name if p.action else None,
                'is_granted': p.is_granted
            })
        
        return jsonify({
            'success': True,
            'records': result,
            'pagination': {
                'page': pagination.page,
                'pages': pagination.pages,
                'total': pagination.total,
                'per_page': pagination.per_page
            }
        })
    except Exception as e:
        logger.error(f"Error fetching role permissions: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@role_perms_bp.route('/add', methods=['POST'])
@require_auth
def add_role_permission():
    """Add a permission to a role"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        role_id = data.get('role_id')
        module_id = data.get('module_id')
        action_id = data.get('action_id')
        
        # Validate required fields
        if not role_id:
            return jsonify({'success': False, 'error': 'role_id is required'}), 400
        if not module_id:
            return jsonify({'success': False, 'error': 'module_id is required'}), 400
        if not action_id:
            return jsonify({'success': False, 'error': 'action_id is required'}), 400
        
        # Check if role exists
        role = Roles.query.get(role_id)
        if not role:
            return jsonify({'success': False, 'error': 'Role not found'}), 404
        
        # Check if module exists
        module = PermissionModules.query.get(module_id)
        if not module:
            return jsonify({'success': False, 'error': 'Module not found'}), 404
        
        # Check if action exists
        action = PermissionActions.query.get(action_id)
        if not action:
            return jsonify({'success': False, 'error': 'Action not found'}), 404
        
        # Check for duplicate
        existing = RolePermissions.query.filter_by(
            role_id=role_id,
            module_id=module_id,
            action_id=action_id
        ).first()
        
        if existing:
            # Update existing permission
            existing.is_granted = data.get('is_granted', True)
            db.session.commit()
            return jsonify({
                'success': True,
                'record': {'id': existing.id},
                'message': 'Permission updated successfully'
            })
        
        # Create new permission
        perm = RolePermissions(
            role_id=role_id,
            module_id=module_id,
            action_id=action_id,
            is_granted=data.get('is_granted', True)
        )
        
        db.session.add(perm)
        db.session.commit()
        
        logger.info(f"Permission added to role {role_id}: {module.module_code}:{action.action_code}")
        
        return jsonify({
            'success': True,
            'record': {'id': perm.id},
            'message': 'Permission granted successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding role permission: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@role_perms_bp.route('/revoke/<int:perm_id>', methods=['DELETE'])
@require_auth
def revoke_role_permission(perm_id):
    """Revoke a permission from a role"""
    try:
        perm = RolePermissions.query.get(perm_id)
        if not perm:
            return jsonify({'success': False, 'error': 'Permission not found'}), 404
        
        db.session.delete(perm)
        db.session.commit()
        
        logger.info(f"Permission {perm_id} revoked from role {perm.role_id}")
        
        return jsonify({
            'success': True,
            'message': 'Permission revoked successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error revoking role permission {perm_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@role_perms_bp.route('/batch', methods=['POST'])
@require_auth
def batch_update_permissions():
    """Batch update permissions for a role"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        role_id = data.get('role_id')
        permissions = data.get('permissions', [])
        
        if not role_id:
            return jsonify({'success': False, 'error': 'role_id is required'}), 400
        
        # Verify role exists
        role = Roles.query.get(role_id)
        if not role:
            return jsonify({'success': False, 'error': 'Role not found'}), 404
        
        # Remove all existing permissions for this role
        RolePermissions.query.filter_by(role_id=role_id).delete()
        
        # Add new permissions
        for perm in permissions:
            new_perm = RolePermissions(
                role_id=role_id,
                module_id=perm.get('module_id'),
                action_id=perm.get('action_id'),
                is_granted=perm.get('is_granted', True)
            )
            db.session.add(new_perm)
        
        db.session.commit()
        
        logger.info(f"Batch update permissions for role {role_id}: {len(permissions)} permissions set")
        
        return jsonify({
            'success': True,
            'message': f'{len(permissions)} permissions updated successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error batch updating permissions: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


# User Custom Permissions
user_perms_bp = Blueprint('user_custom_permissions', __name__)


@user_perms_bp.route('')
@user_perms_bp.route('/index')
def user_perms_index():
    """Get user custom permissions with filters"""
    try:
        user_id = request.args.get('user_id', type=int)
        active_only = request.args.get('active_only', type=bool, default=True)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        query = UserCustomPermissions.query
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        if active_only:
            query = query.filter(
                UserCustomPermissions.is_granted == True,
                or_(
                    UserCustomPermissions.expires_at.is_(None),
                    UserCustomPermissions.expires_at > datetime.utcnow()
                )
            )
        
        pagination = query.order_by(UserCustomPermissions.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Get related data
        result = []
        for p in pagination.items:
            result.append({
                'id': p.id,
                'user_id': p.user_id,
                'user_name': p.user.username if p.user else None,
                'module_id': p.module_id,
                'module_name': p.module.module_name if p.module else None,
                'action_id': p.action_id,
                'action_name': p.action.action_name if p.action else None,
                'is_granted': p.is_granted,
                'granted_by': p.granted_by,
                'granted_by_name': p.grantor.username if p.grantor else None,
                'expires_at': p.expires_at.isoformat() if p.expires_at else None,
                'is_expired': p.expires_at and p.expires_at < datetime.utcnow(),
                'created_at': p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else None
            })
        
        return jsonify({
            'success': True,
            'records': result,
            'pagination': {
                'page': pagination.page,
                'pages': pagination.pages,
                'total': pagination.total,
                'per_page': pagination.per_page
            }
        })
    except Exception as e:
        logger.error(f"Error fetching user permissions: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@user_perms_bp.route('/grant', methods=['POST'])
@require_auth
def grant_user_permission():
    """Grant a custom permission to a user"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Validate required fields
        required = ['user_id', 'module_id', 'action_id']
        for field in required:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        user_id = data['user_id']
        module_id = data['module_id']
        action_id = data['action_id']
        
        # Check if user exists
        user = Users.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Check if module exists
        module = PermissionModules.query.get(module_id)
        if not module:
            return jsonify({'success': False, 'error': 'Module not found'}), 404
        
        # Check if action exists
        action = PermissionActions.query.get(action_id)
        if not action:
            return jsonify({'success': False, 'error': 'Action not found'}), 404
        
        # Handle expiration
        expires_at = None
        expires_days = data.get('expires_days')
        if expires_days:
            try:
                expires_days = int(expires_days)
                if expires_days > 0:
                    expires_at = datetime.utcnow() + timedelta(days=expires_days)
            except (TypeError, ValueError):
                return jsonify({'success': False, 'error': 'expires_days must be a positive integer'}), 400
        
        # Check if permission already exists
        existing = UserCustomPermissions.query.filter_by(
            user_id=user_id,
            module_id=module_id,
            action_id=action_id
        ).first()
        
        current_user_id = get_jwt_identity()
        
        if existing:
            # Update existing permission
            existing.is_granted = data.get('is_granted', True)
            existing.granted_by = current_user_id
            existing.expires_at = expires_at
            db.session.commit()
            
            return jsonify({
                'success': True,
                'record': {'id': existing.id},
                'message': 'User permission updated successfully'
            })
        
        # Create new permission
        perm = UserCustomPermissions(
            user_id=user_id,
            module_id=module_id,
            action_id=action_id,
            is_granted=data.get('is_granted', True),
            granted_by=current_user_id,
            expires_at=expires_at
        )
        
        db.session.add(perm)
        db.session.commit()
        
        logger.info(f"Custom permission granted to user {user_id}: {module.module_code}:{action.action_code}")
        
        return jsonify({
            'success': True,
            'record': {'id': perm.id},
            'message': 'User permission granted successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error granting user permission: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@user_perms_bp.route('/revoke/<int:perm_id>', methods=['DELETE'])
@require_auth
def revoke_user_permission(perm_id):
    """Revoke a custom permission from a user"""
    try:
        perm = UserCustomPermissions.query.get(perm_id)
        if not perm:
            return jsonify({'success': False, 'error': 'Permission not found'}), 404
        
        # Option 1: Hard delete
        db.session.delete(perm)
        
        # Option 2: Soft delete (uncomment if preferred)
        # perm.is_granted = False
        
        db.session.commit()
        
        logger.info(f"Custom permission {perm_id} revoked from user {perm.user_id}")
        
        return jsonify({
            'success': True,
            'message': 'User permission revoked successfully'
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error revoking user permission {perm_id}: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@user_perms_bp.route('/check', methods=['POST'])
@require_auth
def check_user_permission():
    """Check if a user has a specific permission"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        user_id = data.get('user_id')
        module_code = data.get('module_code')
        action_code = data.get('action_code')
        
        if not user_id or not module_code or not action_code:
            return jsonify({
                'success': False,
                'error': 'user_id, module_code, and action_code are required'
            }), 400
        
        # Get module and action IDs
        module = PermissionModules.query.filter_by(module_code=module_code).first()
        action = PermissionActions.query.filter_by(action_code=action_code).first()
        
        if not module or not action:
            return jsonify({
                'success': True,
                'has_permission': False,
                'reason': 'Module or action not found'
            })
        
        # Check user's role permission
        user = Users.query.get(user_id)
        has_permission = False
        reason = None
        
        if user and user.role_id:
            role_perm = RolePermissions.query.filter_by(
                role_id=user.role_id,
                module_id=module.module_id,
                action_id=action.action_id,
                is_granted=True
            ).first()
            
            if role_perm:
                has_permission = True
                reason = 'Granted by role'
        
        # Check custom permissions (override role permission if denied)
        custom_perm = UserCustomPermissions.query.filter_by(
            user_id=user_id,
            module_id=module.module_id,
            action_id=action.action_id
        ).first()
        
        if custom_perm:
            if custom_perm.is_granted:
                # Check if not expired
                if custom_perm.expires_at and custom_perm.expires_at < datetime.utcnow():
                    has_permission = False
                    reason = 'Custom permission expired'
                else:
                    has_permission = True
                    reason = 'Granted by custom permission'
            else:
                has_permission = False
                reason = 'Denied by custom permission'
        
        return jsonify({
            'success': True,
            'has_permission': has_permission,
            'reason': reason,
            'user_id': user_id,
            'module_code': module_code,
            'action_code': action_code
        })
    except Exception as e:
        logger.error(f"Error checking user permission: {str(e)}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500