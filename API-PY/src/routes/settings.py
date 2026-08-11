from flask import Blueprint, request, jsonify
from src.models import db, Settings

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/', methods=['GET'])
def index():
    settings = Settings.query.first()
    if not settings:
        return jsonify({'success': True, 'record': {}})
    return jsonify({
        'success': True,
        'record': {
            'id': settings.id,
            'paybill_no': settings.paybill_no,
            'account_no': settings.account_no,
            'buygoods_till': settings.buygoods_till,
            'no_of_sliders': settings.no_of_sliders,
            'publishing_rate': settings.publishing_rate,
            'app_version': settings.app_version
        }
    })


@settings_bp.route('/publisher-agreement', methods=['GET'])
def publisher_agreement():
    settings = Settings.query.first()
    if not settings:
        return jsonify({'success': True, 'record': {}})
    return jsonify({
        'success': True,
        'record': {
            'publisher_agreement': settings.publisher_agreement or ''
        }
    })


@settings_bp.route('/publisher-declaration', methods=['GET'])
def publisher_declaration():
    settings = Settings.query.first()
    if not settings:
        return jsonify({'success': True, 'record': {}})
    return jsonify({
        'success': True,
        'record': {
            'publisher_declaration': settings.publisher_declaration or ''
        }
    })


@settings_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    settings = Settings(
        paybill_no=data.get('paybill_no'),
        account_no=data.get('account_no'),
        buygoods_till=data.get('buygoods_till'),
        no_of_sliders=data.get('no_of_sliders'),
        publishing_rate=data.get('publishing_rate'),
        publisher_declaration=data.get('publisher_declaration', ''),
        publisher_agreement=data.get('publisher_agreement', ''),
        app_version=data.get('app_version')
    )
    db.session.add(settings)
    db.session.commit()
    return jsonify({'success': True, 'record': {'id': settings.id}})


@settings_bp.route('/edit/<int:id>', methods=['PUT'])
def edit(id):
    settings = Settings.query.get(id)
    if not settings:
        return jsonify({'success': False, 'error': 'Settings not found'}), 404
    data = request.get_json()
    for key in ['paybill_no', 'account_no', 'buygoods_till', 'no_of_sliders', 'publishing_rate', 'publisher_declaration', 'publisher_agreement', 'app_version']:
        if key in data:
            setattr(settings, key, data[key])
    db.session.commit()
    return jsonify({'success': True})


# Donations
from src.models import Donations

donations_bp = Blueprint('donations', __name__)


@donations_bp.route('/index', methods=['GET'])
def index():
    donations = Donations.query.order_by(Donations.id.desc()).all()
    return jsonify({
        'success': True,
        'records': [{'id': d.id, 'name': d.name, 'amount': d.amount, 'reference': d.reference, 'status': d.status} for d in donations]
    })


@donations_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    donation = Donations(
        name=data.get('name'),
        amount=data.get('amount'),
        reference=data.get('reference'),
        phone_number=data.get('phone_number'),
        status='pending'
    )
    db.session.add(donation)
    db.session.commit()
    return jsonify({'success': True, 'record': {'id': donation.id}})


@donations_bp.route('/edit/<int:id>', methods=['PUT'])
def edit(id):
    donation = Donations.query.get(id)
    if not donation:
        return jsonify({'success': False, 'error': 'Donation not found'}), 404
    data = request.get_json()
    if 'status' in data:
        donation.status = data['status']
    db.session.commit()
    return jsonify({'success': True})

# Roles
from src.models import Roles

settings_roles_bp = Blueprint('settings_roles', __name__)


@settings_roles_bp.route('/index', methods=['GET'])
def index():
    roles = Roles.query.all()
    return jsonify({
        'success': True,
        'records': [{'role_id': r.role_id, 'role_name': r.role_name, 'role_code': r.role_code, 'description': r.description} for r in roles]
    })


@settings_roles_bp.route('/view/<int:role_id>', methods=['GET'])
def view(role_id):
    role = Roles.query.get(role_id)
    if not role:
        return jsonify({'success': False, 'error': 'Role not found'}), 404
    return jsonify({'success': True, 'record': {'role_id': role.role_id, 'role_name': role.role_name, 'role_code': role.role_code}})


@settings_roles_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    role = Roles(
        role_name=data.get('role_name'),
        role_code=data.get('role_code'),
        description=data.get('description')
    )
    db.session.add(role)
    db.session.commit()
    return jsonify({'success': True, 'record': {'role_id': role.role_id}})


@settings_roles_bp.route('/edit/<int:role_id>', methods=['PUT'])
def edit(role_id):
    role = Roles.query.get(role_id)
    if not role:
        return jsonify({'success': False, 'error': 'Role not found'}), 404
    data = request.get_json()
    for key in ['role_name', 'role_code', 'description']:
        if key in data:
            setattr(role, key, data[key])
    db.session.commit()
    return jsonify({'success': True})


@settings_roles_bp.route('/delete/<int:role_id>', methods=['DELETE'])
def delete(role_id):
    role = Roles.query.get(role_id)
    if not role:
        return jsonify({'success': False, 'error': 'Role not found'}), 404
    db.session.delete(role)
    db.session.commit()
    return jsonify({'success': True})
