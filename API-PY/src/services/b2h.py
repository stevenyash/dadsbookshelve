import hmac
import hashlib
import json
import os
import logging
from datetime import datetime, timezone
from typing import Any

import requests

logger = logging.getLogger(__name__)


DEFAULT_B2H_ACTIONS = [
    {
        'name': 'BORROW_FROM_LIBRARY',
        'display_name': 'Borrow from Library',
        'description': 'User borrows or subscribes to library access through Dad\'s BookShelves',
    },
    {
        'name': 'PURCHASE_BOOK',
        'display_name': 'Purchase Book',
        'description': 'User purchases a book through Dad\'s BookShelves',
    },
    {
        'name': 'EBOOK_PURCHASE',
        'display_name': 'Ebook Purchase',
        'description': 'User purchases an ebook conversion or ebook product through Dad\'s BookShelves',
    },
    {
        'name': 'DONATION_MADE',
        'display_name': 'Donation Made',
        'description': 'User makes a donation through Dad\'s BookShelves',
    },
    {
        'name': 'MEMBERSHIP_SUBSCRIBED',
        'display_name': 'Membership Subscribed',
        'description': 'User subscribes to a paid membership through Dad\'s BookShelves',
    },
]


class B2HService:
    def __init__(self):
        self.api_key = os.getenv('B2H_API_KEY', '')
        self.webhook_secret = os.getenv('B2H_WEBHOOK_SECRET', '')
        self.api_base = os.getenv('B2H_API_BASE', 'https://api.bitshustlehubs.co.ke/api').rstrip('/')
        self.webhook_url = os.getenv('B2H_WEBHOOK_URL', f"{self.api_base}/webhooks/external-conversion")
        self.platform_id = os.getenv('B2H_PLATFORM_ID', '3ee6c447-128f-46fa-b248-7f7e90d59d38')
        self.platform_identifier = os.getenv('B2H_PLATFORM_IDENTIFIER', 'BITS_DADS_BOOKSHELVES')

    def _response_data(self, response: requests.Response) -> Any:
        if not response.text:
            return {}
        try:
            return response.json()
        except ValueError:
            return {'raw': response.text}

    def sign_payload(self, payload: dict[str, Any]) -> str:
        payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
        signature = hmac.new(
            self.webhook_secret.encode('utf-8'),
            payload_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature

    def verify_signature(self, payload: dict[str, Any], signature: str) -> bool:
        if not self.webhook_secret:
            logger.warning('B2H_WEBHOOK_SECRET not configured')
            return False
        expected = self.sign_payload(payload)
        return hmac.compare_digest(expected, signature)

    def _headers(self) -> dict[str, str]:
        return {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key,
        }

    def get_default_actions(self) -> list[dict[str, str]]:
        return [dict(action) for action in DEFAULT_B2H_ACTIONS]

    def register_action(self, name: str, display_name: str, description: str = '') -> dict[str, Any]:
        if not self.is_configured():
            return {'success': False, 'error': 'B2H integration not configured'}

        url = f"{self.api_base}/platform-actions/register"
        payload = {
            'name': name,
            'display_name': display_name,
            'description': description,
        }
        try:
            response = requests.post(url, headers=self._headers(), json=payload, timeout=10)
            return {
                'success': response.status_code in [200, 201, 409],
                'status_code': response.status_code,
                'data': self._response_data(response),
            }
        except requests.RequestException as e:
            logger.error('B2H register_action error: %s', e)
            return {'success': False, 'error': str(e)}

    def register_default_actions(self) -> dict[str, Any]:
        results = []
        all_success = True
        for action in DEFAULT_B2H_ACTIONS:
            result = self.register_action(
                name=action['name'],
                display_name=action['display_name'],
                description=action['description'],
            )
            results.append({**action, **result})
            if not result.get('success'):
                all_success = False
        return {
            'success': all_success,
            'registered': all_success,
            'results': results,
        }

    def register_referral_rate(self, action: str, rate: float, tier: str = 'DEFAULT', is_percentage: bool = False) -> dict[str, Any]:
        if not self.is_configured():
            return {'success': False, 'error': 'B2H integration not configured'}

        url = f"{self.api_base}/referral-rates"
        payload = {
            'platform_id': self.platform_id,
            'tier': tier,
            'action': action,
            'rate': rate,
            'is_percentage': is_percentage,
        }
        try:
            response = requests.post(url, headers=self._headers(), json=payload, timeout=10)
            return {
                'success': response.status_code in [200, 201, 409],
                'status_code': response.status_code,
                'data': self._response_data(response),
            }
        except requests.RequestException as e:
            logger.error('B2H register_referral_rate error: %s', e)
            return {'success': False, 'error': str(e)}

    def register_referral_rates(self, rates: list[dict[str, Any]]) -> dict[str, Any]:
        results = []
        all_success = True
        for rate in rates:
            action = rate.get('action')
            rate_value = rate.get('rate')
            if not action or rate_value is None:
                results.append({'success': False, 'error': 'action and rate required', 'input': rate})
                all_success = False
                continue

            try:
                result = self.register_referral_rate(
                    action=str(action),
                    rate=float(rate_value),
                    tier=str(rate.get('tier', 'DEFAULT')),
                    is_percentage=bool(rate.get('is_percentage', False)),
                )
            except (TypeError, ValueError) as e:
                result = {'success': False, 'error': str(e), 'input': rate}

            results.append({**rate, **result})
            if not result.get('success'):
                all_success = False

        return {
            'success': all_success,
            'registered': all_success,
            'results': results,
        }

    def build_conversion_payload(
        self,
        referral_code: str,
        action: str,
        amount: float = 0.0,
        external_user_id: str = '',
        email: str = '',
        email_verified: bool = True,
        conversion_status: str = 'CONVERTED',
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        payload: dict[str, Any] = {
            'referral_code': referral_code,
            'action': action,
            'platform_id': self.platform_id,
            'conversion_status': conversion_status,
            'converted_at': now,
            'timestamp': now,
        }
        payload['amount'] = amount
        if external_user_id:
            payload['external_user_id'] = external_user_id
        if email:
            payload['email'] = email
            payload['email_verified'] = email_verified
        return payload

    def send_conversion_webhook(
        self,
        referral_code: str,
        action: str,
        amount: float = 0.0,
        external_user_id: str = '',
        email: str = '',
        email_verified: bool = True,
        conversion_status: str = 'CONVERTED',
    ) -> dict[str, Any]:
        if not self.is_configured():
            return {'success': False, 'error': 'B2H integration not configured'}

        payload = self.build_conversion_payload(
            referral_code=referral_code,
            action=action,
            amount=amount,
            external_user_id=external_user_id,
            email=email,
            email_verified=email_verified,
            conversion_status=conversion_status,
        )
        sig = self.sign_payload(payload)

        url = self.webhook_url
        headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': sig,
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            logger.info('B2H conversion webhook response', extra={
                'statusCode': response.status_code,
                'referralCode': referral_code,
                'action': action,
            })
            return {
                'success': response.status_code in [200, 409],
                'status_code': response.status_code,
                'data': self._response_data(response),
            }
        except requests.RequestException as e:
            logger.error('B2H conversion webhook error: %s', e)
            return {'success': False, 'error': str(e)}

    def verify_webhook(self, signature: str, payload: dict[str, Any]) -> bool:
        return self.verify_signature(payload, signature)

    def is_configured(self) -> bool:
        return bool(self.api_key and self.webhook_secret and self.api_base and self.platform_id)


b2h_service = B2HService()
