from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from src.middleware.auth import require_auth, require_admin, check_permission
from src.models import db


def create_crud_blueprint(model, model_name, pk_field='id', required_role=None):
    """Generic CRUD blueprint factory"""
    
    name = model_name.lower()
    bp = Blueprint(name, __name__)
    
    @bp.route('/index', methods=['GET'])
    def index():
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        
        query = model.query
        
        # Add search if model has name/title fields
        if search:
            if hasattr(model, 'title'):
                query = query.filter(model.title.ilike(f'%{search}%'))
            elif hasattr(model, 'name'):
                query = query.filter(model.name.ilike(f'%{search}%'))
            elif hasattr(model, 'full_name'):
                query = query.filter(model.full_name.ilike(f'%{search}%'))
        
        total = query.count()
        records = query.offset((page - 1) * limit).limit(limit).all()
        
        return jsonify({
            'success': True,
            'records': [r.to_dict() if hasattr(r, 'to_dict') else {'id': getattr(r, pk_field)} for r in records],
            'total': total,
            'page': page,
            'limit': limit
        })
    
    @bp.route(f'/view/<int:{pk_field}>', methods=['GET'])
    def view(pk_field):
        record = getattr(model, pk_field, None) if isinstance(pk_field, str) else model.query.get(pk_field)
        record = model.query.get(pk_field)
        if not record:
            return jsonify({'success': False, 'error': f'{model_name} not found'}), 404
        
        return jsonify({
            'success': True,
            'record': record.to_dict() if hasattr(record, 'to_dict') else {'id': getattr(record, pk_field)}
        })
    
    @bp.route('/add', methods=['POST'])
    def add():
        data = request.get_json()
        
        record = model()
        for key, value in data.items():
            if hasattr(record, key):
                setattr(record, key, value)
        
        db.session.add(record)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'record': record.to_dict() if hasattr(record, 'to_dict') else {'id': getattr(record, pk_field)},
            'message': f'{model_name} added successfully'
        })
    
    @bp.route(f'/edit/<int:{pk_field}>', methods=['PUT'])
    def edit(pk_field):
        record = model.query.get(pk_field)
        if not record:
            return jsonify({'success': False, 'error': f'{model_name} not found'}), 404
        
        data = request.get_json()
        for key, value in data.items():
            if hasattr(record, key):
                setattr(record, key, value)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'record': record.to_dict() if hasattr(record, 'to_dict') else {'id': getattr(record, pk_field)},
            'message': f'{model_name} updated successfully'
        })
    
    @bp.route(f'/delete/<int:{pk_field}>', methods=['DELETE'])
    def delete(pk_field):
        record = model.query.get(pk_field)
        if not record:
            return jsonify({'success': False, 'error': f'{model_name} not found'}), 404
        
        db.session.delete(record)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{model_name} deleted successfully'
        })
    
    return bp


def create_crud_routes(bp, model, model_name, pk_field='id', auth_required=True):
    """Add CRUD routes to existing blueprint"""
    
    @bp.route('/index', methods=['GET'])
    def index():
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        
        query = model.query
        
        if search:
            if hasattr(model, 'title'):
                query = query.filter(model.title.ilike(f'%{search}%'))
            elif hasattr(model, 'name'):
                query = query.filter(model.name.ilike(f'%{search}%'))
            elif hasattr(model, 'full_name'):
                query = query.filter(model.full_name.ilike(f'%{search}%'))
        
        total = query.count()
        records = query.offset((page - 1) * limit).limit(limit).all()
        
        return jsonify({
            'success': True,
            'records': [_to_dict(r) for r in records],
            'total': total,
            'page': page,
            'limit': limit
        })
    
    @bp.route(f'/view/<int:{pk_field}>', methods=['GET'])
    def view(pk_field):
        record = model.query.get(pk_field)
        if not record:
            return jsonify({'success': False, 'error': f'{model_name} not found'}), 404
        return jsonify({'success': True, 'record': _to_dict(record)})
    
    @bp.route('/add', methods=['POST'])
    def add():
        data = request.get_json()
        record = model()
        for key, value in data.items():
            if hasattr(record, key):
                setattr(record, key, value)
        db.session.add(record)
        db.session.commit()
        return jsonify({'success': True, 'record': _to_dict(record), 'message': f'{model_name} added'})
    
    @bp.route(f'/edit/<int:{pk_field}>', methods=['PUT'])
    def edit(pk_field):
        record = model.query.get(pk_field)
        if not record:
            return jsonify({'success': False, 'error': f'{model_name} not found'}), 404
        data = request.get_json()
        for key, value in data.items():
            if hasattr(record, key):
                setattr(record, key, value)
        db.session.commit()
        return jsonify({'success': True, 'record': _to_dict(record), 'message': f'{model_name} updated'})
    
    @bp.route(f'/delete/<int:{pk_field}>', methods=['DELETE'])
    def delete(pk_field):
        record = model.query.get(pk_field)
        if not record:
            return jsonify({'success': False, 'error': f'{model_name} not found'}), 404
        db.session.delete(record)
        db.session.commit()
        return jsonify({'success': True, 'message': f'{model_name} deleted'})
    
    return bp


def _to_dict(record):
    """Convert model to dict"""
    if hasattr(record, 'to_dict'):
        return record.to_dict()
    result = {}
    for col in record.__table__.columns:
        value = getattr(record, col.name)
        if hasattr(value, 'isoformat'):
            value = value.isoformat()
        result[col.name] = value
    return result
