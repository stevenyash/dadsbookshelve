import logging
from flask import Blueprint, request, jsonify
from src.services.b2h import b2h_service

logger = logging.getLogger(__name__)

b2h_bp = Blueprint('b2h', __name__)

_local_actions_store = {}
_local_rates_store = {}


def _require_b2h_key():
    api_key = request.headers.get('X-API-Key', '')
    if not api_key or api_key != b2h_service.api_key:
        logger.warning('B2H endpoint rejected: invalid or missing X-API-Key')
        return jsonify({'success': False, 'error': 'Invalid or missing API key'}), 401
    return None


def _is_local_mode():
    return 'localhost' in (b2h_service.api_base or '') or '127.0.0.1' in (b2h_service.api_base or '')


@b2h_bp.route('/webhook', methods=['POST'])
def b2h_webhook():
    if not b2h_service.is_configured():
        logger.warning('B2H webhook received but B2H not configured')
        return jsonify({'success': False, 'error': 'B2H integration not configured'}), 503

    signature = request.headers.get('X-Webhook-Signature', '')
    if not signature:
        logger.warning('B2H webhook missing signature')
        return jsonify({'success': False, 'error': 'Missing signature'}), 401

    payload = request.get_json(silent=True)
    if not payload:
        logger.warning('B2H webhook missing payload')
        return jsonify({'success': False, 'error': 'Invalid payload'}), 400

    if not b2h_service.verify_webhook(signature, payload):
        logger.warning('B2H webhook signature verification failed')
        return jsonify({'success': False, 'error': 'Invalid signature'}), 401

    try:
        action = payload.get('action')
        conversion_status = payload.get('conversion_status')
        referral_code = payload.get('referral_code')
        platform_id = payload.get('platform_id')

        if not all([action, conversion_status, referral_code, platform_id]):
            logger.warning('B2H webhook missing required fields', extra={'payload': payload})
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400

        if platform_id != b2h_service.platform_id:
            logger.warning('B2H webhook platform_id mismatch', extra={
                'expected': b2h_service.platform_id,
                'received': platform_id,
            })
            return jsonify({'success': False, 'error': 'Invalid platform'}), 400

        logger.info('B2H webhook accepted', extra={
            'action': action,
            'referralCode': referral_code,
            'status': conversion_status,
            'platformId': platform_id,
        })
        return jsonify({'success': True}), 200

    except Exception as e:
        logger.error('B2H webhook processing error: %s', e)
        return jsonify({'success': False, 'error': 'Processing failed'}), 500


@b2h_bp.route('/platform-actions/register', methods=['POST'])
def platform_actions_register():
    data = request.get_json() or {}
    name = data.get('name')
    display_name = data.get('display_name')
    description = data.get('description', '')

    if not name or not display_name:
        return jsonify({'success': False, 'error': 'name and display_name required'}), 400

    _local_actions_store[name] = {
        'name': name,
        'display_name': display_name,
        'description': description,
    }

    logger.info('B2H action registered locally', extra={'action': name})

    return jsonify({
        'success': True,
        'data': {'name': name, 'display_name': display_name, 'description': description},
    }), 201


@b2h_bp.route('/platform-actions/register', methods=['GET'])
def platform_actions_list():
    return jsonify({
        'success': True,
        'data': {
            'actions': list(_local_actions_store.values()),
        },
    })


@b2h_bp.route('/referral-rates', methods=['POST'])
def referral_rates_register():
    data = request.get_json() or {}
    rates = data.get('rates')

    if not rates:
        action = data.get('action')
        rate = data.get('rate')
        if not action or rate is None:
            return jsonify({'success': False, 'error': 'rates array or action/rate required'}), 400
        rates = [data]

    results = []
    for rate in rates:
        action = rate.get('action')
        rate_value = rate.get('rate')
        if not action or rate_value is None:
            continue

        tier = str(rate.get('tier', 'DEFAULT'))
        is_percentage = bool(rate.get('is_percentage', False))

        _local_rates_store[action] = {
            'platform_id': data.get('platform_id', b2h_service.platform_id),
            'tier': tier,
            'action': action,
            'rate': float(rate_value),
            'is_percentage': is_percentage,
        }

        logger.info('B2H rate registered locally', extra={'action': action, 'rate': rate_value, 'tier': tier})
        results.append({'_local_action': action, '_local_rate': rate_value, '_local_tier': tier})

    return jsonify({
        'success': True,
        'data': {'rates': list(_local_rates_store.values())},
    }), 200


@b2h_bp.route('/referral-rates', methods=['GET'])
def referral_rates_list():
    return jsonify({
        'success': True,
        'data': {
            'rates': list(_local_rates_store.values()),
        },
    })


@b2h_bp.route('/referral-rates/bulk', methods=['POST'])
def referral_rates_bulk():
    auth_error = _require_b2h_key()
    if auth_error:
        return auth_error
    data = request.get_json() or {}
    rates = data.get('rates')

    if not rates:
        return jsonify({'success': False, 'error': 'rates array required'}), 400

    results = []
    for rate in rates:
        action = rate.get('action')
        rate_value = rate.get('rate')
        if not action or rate_value is None:
            continue

        tier = str(rate.get('tier', 'DEFAULT'))
        is_percentage = bool(rate.get('is_percentage', False))

        entry = {
            'platform_id': rate.get('platform_id', b2h_service.platform_id),
            'tier': tier,
            'action': action,
            'rate': float(rate_value),
            'is_percentage': is_percentage,
        }
        _local_rates_store[action] = entry
        results.append(entry)

    logger.info('B2H rates registered locally', extra={'count': len(results)})
    return jsonify({'success': True, 'data': {'rates': list(_local_rates_store.values())}}), 200


@b2h_bp.route('/default-actions', methods=['GET'])
def default_actions():
    auth_error = _require_b2h_key()
    if auth_error:
        return auth_error
    return jsonify({
        'success': True,
        'data': {
            'actions': b2h_service.get_default_actions(),
        }
    })


@b2h_bp.route('/register-default-actions', methods=['POST'])
def register_default_actions():
    auth_error = _require_b2h_key()
    if auth_error:
        return auth_error

    if _is_local_mode():
        results = []
        for action in b2h_service.get_default_actions():
            _local_actions_store[action['name']] = action
            results.append(action)
        return jsonify({
            'success': True,
            'registered': True,
            'results': results,
        }), 200

    result = b2h_service.register_default_actions()
    status_code = 200 if result.get('success') else 500
    return jsonify(result), status_code


@b2h_bp.route('/register-action', methods=['POST'])
def register_action():
    auth_error = _require_b2h_key()
    if auth_error:
        return auth_error
    data = request.get_json() or {}
    name = data.get('name')
    display_name = data.get('display_name')
    description = data.get('description', '')

    if not name or not display_name:
        return jsonify({'success': False, 'error': 'name and display_name required'}), 400

    if _is_local_mode():
        entry = {'name': name, 'display_name': display_name, 'description': description}
        _local_actions_store[name] = entry
        logger.info('B2H action registered locally', extra={'action': name})
        return jsonify({'success': True, 'data': entry}), 201

    result = b2h_service.register_action(name, display_name, description)
    status_code = 201 if result.get('success') else result.get('status_code', 500)
    return jsonify(result), status_code


@b2h_bp.route('/register-rate', methods=['POST'])
def register_rate():
    auth_error = _require_b2h_key()
    if auth_error:
        return auth_error
    data = request.get_json() or {}
    action = data.get('action')
    rate = data.get('rate')
    tier = data.get('tier', 'DEFAULT')
    is_percentage = data.get('is_percentage', False)

    if not action or rate is None:
        return jsonify({'success': False, 'error': 'action and rate required'}), 400

    if _is_local_mode():
        entry = {
            'platform_id': data.get('platform_id', b2h_service.platform_id),
            'tier': tier,
            'action': action,
            'rate': float(rate),
            'is_percentage': is_percentage,
        }
        _local_rates_store[action] = entry
        logger.info('B2H rate registered locally', extra={'action': action, 'rate': rate, 'tier': tier})
        return jsonify({'success': True, 'data': entry}), 200

    result = b2h_service.register_referral_rate(action, rate, tier, is_percentage)
    status_code = 200 if result.get('success') else result.get('status_code', 500)
    return jsonify(result), status_code


@b2h_bp.route('/status', methods=['GET'])
def status():
    auth_error = _require_b2h_key()
    if auth_error:
        return auth_error
    return jsonify({
        'success': True,
        'data': {
            'is_configured': b2h_service.is_configured(),
            'platform_id': b2h_service.platform_id,
            'platform_identifier': b2h_service.platform_identifier,
            'api_base': b2h_service.api_base,
            'webhook_secret_configured': bool(b2h_service.webhook_secret),
            'default_actions': b2h_service.get_default_actions(),
            'local_actions_count': len(_local_actions_store),
            'local_rates_count': len(_local_rates_store),
        }
    })
