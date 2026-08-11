import requests
import base64
import os
import logging
from datetime import datetime
from flask import request

logger = logging.getLogger(__name__)


class PayPalService:
    def __init__(self):
        self.cached_token = None
        self.token_expires_at = None
    
    @property
    def config(self):
        return {
            'client_id': os.getenv('PAYPAL_CLIENT_ID', '').strip(),
            'client_secret': os.getenv('PAYPAL_CLIENT_SECRET', '').strip(),
            'mode': os.getenv('PAYPAL_MODE', 'sandbox'),
            'return_url': os.getenv('PAYPAL_RETURN_URL'),
            'cancel_url': os.getenv('PAYPAL_CANCEL_URL'),
        }
    
    @property
    def api_base(self):
        return 'https://api-m.paypal.com' if self.config['mode'] == 'live' else 'https://api-m.sandbox.paypal.com'
    
    def get_access_token(self):
        """Get PayPal OAuth access token"""
        if self.cached_token and self.token_expires_at and datetime.now().timestamp() < self.token_expires_at:
            return self.cached_token
        
        try:
            auth = base64.b64encode(f"{self.config['client_id']}:{self.config['client_secret']}".encode()).decode()
            
            response = requests.post(
                f"{self.api_base}/v1/oauth2/token",
                headers={'Authorization': f'Basic {auth}'},
                data={'grant_type': 'client_credentials'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.cached_token = data['access_token']
                self.token_expires_at = datetime.now().timestamp() + (data['expires_in'] - 60)
                logger.info('PayPal token acquired', extra={'expiresIn': data['expires_in']})
                return self.cached_token
            else:
                logger.error('PayPal token failed', extra={'status': response.status_code, 'error': response.text})
                raise Exception(f"Failed to get PayPal token: {response.text}")
        except Exception as e:
            logger.error('PayPal get_access_token error', extra={'error': str(e)})
            raise
    
    def create_order(self, amount, currency, reference, description='DADS Bookshelves Purchase', module=None):
        """Create PayPal order with dynamic return URLs"""
        try:
            token = self.get_access_token()
            
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
            
            # Dynamic URLs based on module
            return_url = f"{frontend_url}/payments/status?module={module}" if module else f"{frontend_url}/payments/status?reference={reference}"
            cancel_url = f"{frontend_url}/payments/cancelled?module={module}" if module else f"{frontend_url}/payments/cancelled?reference={reference}"
            
            logger.info('Creating PayPal order', extra={'amount': amount, 'currency': currency, 'returnUrl': return_url})
            
            order_data = {
                'intent': 'CAPTURE',
                'purchase_units': [{
                    'reference_id': f'REF-{reference}',
                    'description': description,
                    'amount': {
                        'currency_code': currency,
                        'value': f'{float(amount):.2f}',
                    },
                }],
                'application_context': {
                    'brand_name': 'DADS Bookshelves',
                    'landing_page': 'BILLING',
                    'user_action': 'PAY_NOW',
                    'return_url': return_url,
                    'cancel_url': cancel_url,
                },
            }
            
            response = requests.post(
                f"{self.api_base}/v2/checkout/orders",
                json=order_data,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json',
                }
            )
            
            if response.status_code == 201:
                order = response.json()
                approve_link = next((link['href'] for link in order.get('links', []) if link['rel'] == 'approve'), None)
                
                logger.info('PayPal order created', extra={'orderId': order['id'], 'approvalUrl': approve_link})
                
                return {
                    'success': True,
                    'order_id': order['id'],
                    'approval_url': approve_link
                }
            else:
                logger.error('PayPal create order failed', extra={'status': response.status_code, 'error': response.text})
                return {
                    'success': False,
                    'error': response.json().get('message', 'Failed to create order')
                }
        except Exception as e:
            logger.error('PayPal create_order error', extra={'error': str(e)})
            return {'success': False, 'error': str(e)}
    
    def verify_order(self, order_id):
        """Verify PayPal order status"""
        try:
            token = self.get_access_token()
            
            response = requests.get(
                f"{self.api_base}/v2/checkout/orders/{order_id}",
                headers={'Authorization': f'Bearer {token}'}
            )
            
            if response.status_code == 200:
                order = response.json()
                logger.info('PayPal order verified', extra={'orderId': order_id, 'status': order.get('status')})
                return {
                    'success': True,
                    'status': order.get('status'),
                    'order': order
                }
            logger.error('PayPal order not found', extra={'orderId': order_id})
            return {'success': False, 'error': 'Order not found'}
        except Exception as e:
            logger.error('PayPal verify_order error', extra={'error': str(e)})
            return {'success': False, 'error': str(e)}
    
    def capture_order(self, order_id):
        """Capture PayPal order payment"""
        try:
            token = self.get_access_token()
            
            response = requests.post(
                f"{self.api_base}/v2/checkout/orders/{order_id}/capture",
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json',
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info('PayPal order captured', extra={'orderId': order_id, 'status': data.get('status')})
                return {
                    'success': data.get('status') == 'COMPLETED',
                    'status': data.get('status'),
                    'capture_id': data.get('purchase_units', [{}])[0].get('payments', {}).get('captures', [{}])[0].get('id')
                }
            logger.error('PayPal capture failed', extra={'status': response.status_code, 'error': response.text})
            return {
                'success': False,
                'error': response.json().get('message', 'Capture failed')
            }
        except Exception as e:
            logger.error('PayPal capture_order error', extra={'error': str(e)})
            return {'success': False, 'error': str(e)}
    
    def handle_webhook(self, body, headers):
        """Handle PayPal webhook events"""
        try:
            # Get webhook headers
            transmission_sig = headers.get('paypal-transmission-sig')
            transmission_time = headers.get('paypal-transmission-time')
            
            # Verify timestamp (replay attack prevention - within 5 minutes)
            if transmission_time:
                try:
                    webhook_time = int(transmission_time)
                    current_time = int(datetime.now().timestamp())
                    if abs(current_time - webhook_time) > 300:
                        logger.warning('PayPal webhook timestamp out of range', extra={'transmissionTime': transmission_time})
                        return {'success': False, 'message': 'Webhook timestamp invalid'}
                except:
                    pass
            
            event_type = body.get('event_type')
            resource = body.get('resource')
            
            logger.info('PayPal webhook received', extra={'eventType': event_type})
            
            if event_type == 'PAYMENT.CAPTURE.COMPLETED':
                order_id = resource.get('supplementary_data', {}).get('custom_id') or resource.get('custom_id')
                
                if order_id:
                    from src.models import Payments
                    payment = Payments.query.filter_by(checkout_request_id=order_id).first()
                    
                    if payment and payment.status != 'completed':
                        payment.status = 'completed'
                        payment.payment_date = datetime.utcnow()
                        from src import db
                        db.session.commit()
                        
                        # Get module and handle completion
                        metadata = {}
                        if payment.payment_metadata:
                            try:
                                import json
                                metadata = json.loads(payment.payment_metadata) if isinstance(payment.payment_metadata, str) else payment.payment_metadata
                            except:
                                pass
                        
                        module = metadata.get('module', 'book_purchase')
                        
                        # Import here to avoid circular
                        from src.routes.payments import handle_payment_completion
                        handle_payment_completion(payment, module)
                        
                        logger.info('PayPal webhook payment completed', extra={'orderId': order_id, 'paymentId': payment.id})
            
            if event_type in ['PAYMENT.CAPTURE.DENIED', 'PAYMENT.CAPTURE.DECLINED']:
                order_id = resource.get('supplementary_data', {}).get('custom_id') or resource.get('custom_id')
                
                if order_id:
                    from src.models import Payments
                    payment = Payments.query.filter_by(checkout_request_id=order_id).first()
                    
                    if payment:
                        payment.status = 'failed'
                        from src import db
                        db.session.commit()
                        logger.info('PayPal webhook payment denied', extra={'orderId': order_id})
            
            return {'success': True}
        
        except Exception as e:
            logger.error('PayPal webhook error', extra={'error': str(e)})
            return {'success': False, 'message': str(e)}


paypal_service = PayPalService()
