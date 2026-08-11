import requests
import base64
import hashlib
import time
from datetime import datetime
from flask import current_app
import os
import logging

logger = logging.getLogger(__name__)


class MpesaService:
    def __init__(self):
        self.access_token = None
        self.token_expiry = None
    
    @property
    def base_url(self):
        env = os.getenv('MPESA_ENVIRONMENT', 'sandbox')
        return 'https://sandbox.safaricom.co.ke' if env == 'sandbox' else 'https://api.safaricom.co.ke'
    
    @property
    def config(self):
        return {
            'consumer_key': os.getenv('MPESA_CONSUMER_KEY'),
            'consumer_secret': os.getenv('MPESA_CONSUMER_SECRET'),
            'business_shortcode': os.getenv('MPESA_BUSINESS_SHORTCODE'),
            'passkey': os.getenv('MPESA_PASSKEY'),
            'callback_url': os.getenv('MPESA_CALLBACK_URL'),
            'initiator_name': os.getenv('MPESA_INITIATOR_NAME'),
            'initiator_password': os.getenv('MPESA_INITIATOR_PASSWORD'),
        }
    
    def get_access_token(self, force_refresh=False):
        """Get M-Pesa OAuth access token"""
        if force_refresh:
            self.access_token = None
            self.token_expiry = None
        
        if self.access_token and self.token_expiry and datetime.now().timestamp() < self.token_expiry:
            return self.access_token
        
        try:
            creds = base64.b64encode(f"{self.config['consumer_key']}:{self.config['consumer_secret']}".encode()).decode()
            
            logger.info('Requesting M-Pesa token', extra={'baseUrl': self.base_url})
            logger.debug(f"M-Pesa consumer key: {self.config['consumer_key'][:10]}...")
            
            response = requests.get(
                f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials",
                headers={'Authorization': f'Basic {creds}'}
            )
            
            logger.info('M-Pesa token response', extra={'status': response.status_code})
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data['access_token']
                expires_in = int(data.get('expires_in', 3600))
                self.token_expiry = datetime.now().timestamp() + (expires_in - 60)
                logger.info('M-Pesa token acquired', extra={'expiresIn': expires_in})
                return self.access_token
            elif response.status_code == 403:
                return self.get_access_token(force_refresh=True)
            else:
                raise Exception(f"Failed to get access token: {response.text}")
        except Exception as e:
            logger.error('M-Pesa get_access_token error', extra={'error': str(e)})
            raise
    
    def initiate_stk_push(self, phone, amount, reference):
        """Initiate STK Push payment"""
        try:
            token = self.get_access_token()
            
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            password = base64.b64encode(
                f"{self.config['business_shortcode']}{self.config['passkey']}{timestamp}".encode()
            ).decode()
            
            payload = {
                'BusinessShortCode': self.config['business_shortcode'],
                'Password': password,
                'Timestamp': timestamp,
                'TransactionType': 'CustomerPayBillOnline',
                'Amount': int(round(amount)),
                'PartyA': phone,
                'PartyB': self.config['business_shortcode'],
                'PhoneNumber': phone,
                'CallBackURL': self.config['callback_url'],
                'AccountReference': reference,
                'TransactionDesc': f'Payment for {reference}'
            }
            
            logger.info('M-Pesa STK push', extra={'phone': phone, 'amount': amount, 'reference': reference})
            
            response = requests.post(
                f"{self.base_url}/mpesa/stkpush/v1/processrequest",
                json=payload,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info('M-Pesa STK push response', extra={'success': data.get('ResponseCode') == '0', 'checkoutId': data.get('CheckoutRequestID')})
                return {
                    'success': data.get('ResponseCode') == '0',
                    'checkout_request_id': data.get('CheckoutRequestID'),
                    'message': data.get('ResponseDescription', data.get('ResultDesc'))
                }
            else:
                logger.error('M-Pesa STK push failed', extra={'status': response.status_code, 'error': response.text})
                return {
                    'success': False,
                    'error': response.json().get('errorMessage', 'STK push failed')
                }
        except Exception as e:
            logger.error('M-Pesa STK push error', extra={'error': str(e)})
            return {'success': False, 'error': str(e)}
    
    def check_status(self, checkout_request_id):
        """Check transaction status"""
        try:
            token = self.get_access_token()
            
            payload = {
                'BusinessShortCode': self.config['business_shortcode'],
                'CheckoutRequestID': checkout_request_id,
                'Password': base64.b64encode(
                    f"{self.config['business_shortcode']}{self.config['passkey']}{datetime.now().strftime('%Y%m%d%H%M%S')}".encode()
                ).decode(),
                'Timestamp': datetime.now().strftime('%Y%m%d%H%M%S')
            }
            
            logger.info('M-Pesa check status', extra={'checkoutRequestId': checkout_request_id})
            
            response = requests.post(
                f"{self.base_url}/mpesa/stkpushquery/v1/query",
                json=payload,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info('M-Pesa status result', extra={'resultCode': data.get('ResultCode'), 'status': 'completed' if data.get('ResultCode') == '0' else 'failed'})
                return {
                    'status': 'completed' if data.get('ResultCode') == '0' else 'failed',
                    'message': data.get('ResultDesc')
                }
            logger.error('M-Pesa status check failed', extra={'status': response.status_code})
            return {'status': 'failed', 'error': 'Status check failed'}
        except Exception as e:
            logger.error('M-Pesa check_status error', extra={'error': str(e)})
            return {'status': 'failed', 'error': str(e)}
    
    def handle_callback(self, data):
        """Handle M-Pesa callback"""
        try:
            result_code = data.get('ResultCode')
            result_desc = data.get('ResultDesc')
            checkout_request_id = data.get('CheckoutRequestID')
            amount = data.get('CallbackMetadata', {}).get('Amount')
            phone = data.get('CallbackMetadata', {}).get('PhoneNumber')
            mpesa_receipt = data.get('CallbackMetadata', {}).get('MpesaReceiptNumber')
            
            logger.info('M-Pesa callback', extra={'resultCode': result_code, 'checkoutRequestId': checkout_request_id})
            
            if result_code == 0:
                logger.info('M-Pesa callback success', extra={'amount': amount, 'phone': phone, 'receipt': mpesa_receipt})
                return {
                    'success': True,
                    'checkout_request_id': checkout_request_id,
                    'amount': amount,
                    'phone': phone,
                    'receipt': mpesa_receipt
                }
            else:
                logger.warning('M-Pesa callback failed', extra={'resultCode': result_code, 'resultDesc': result_desc})
                return {'success': False, 'error': result_desc}
        except Exception as e:
            logger.error('M-Pesa handle_callback error', extra={'error': str(e)})
            return {'success': False, 'error': str(e)}
    
    def b2c_payment(self, phone, amount, reference):
        """Send money to customer (B2C) - for payouts"""
        try:
            token = self.get_access_token()
            
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            password = base64.b64encode(
                f"{self.config['business_shortcode']}{self.config['passkey']}{timestamp}".encode()
            ).decode()
            
            payload = {
                'OriginatorConversationID': reference,
                'ConversationID': '',
                'Target': self.config['business_shortcode'],
                'ServiceReplyURL': self.config['callback_url'],
                'CommandID': 'BusinessPayment',
                'Amount': int(round(amount)),
                'PartyA': self.config['business_shortcode'],
                'PartyB': phone,
                'Remarks': f'Payout for {reference}',
                'QueueTimeOutURL': self.config['callback_url'],
                'ResultURL': self.config['callback_url']
            }
            
            logger.info('M-Pesa B2C payment', extra={'phone': phone, 'amount': amount, 'reference': reference})
            
            response = requests.post(
                f"{self.base_url}/mpesa/b2c/v1/paymentrequest",
                json=payload,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info('M-Pesa B2C response', extra={'success': data.get('ResponseCode') == '0'})
                return {
                    'success': data.get('ResponseCode') == '0',
                    'conversation_id': data.get('ConversationID'),
                    'message': data.get('ResponseDescription')
                }
            logger.error('M-Pesa B2C failed', extra={'status': response.status_code, 'error': response.text})
            return {'success': False, 'error': response.text}
        except Exception as e:
            logger.error('M-Pesa B2C error', extra={'error': str(e)})
            return {'success': False, 'error': str(e)}
    
    def register_c2b_url(self):
        """Register C2B validation and confirmation URLs"""
        try:
            token = self.get_access_token()
            
            payload = {
                'ShortCode': self.config['business_shortcode'],
                'ResponseType': 'Completed',
                'ConfirmationURL': self.config['callback_url'],
                'ValidationURL': self.config['callback_url'],
            }
            
            logger.info('Registering C2B URLs', extra={'shortCode': self.config['business_shortcode']})
            
            response = requests.post(
                f"{self.base_url}/mpesa/c2b/v1/register",
                json=payload,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json',
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info('C2B registration response', extra={'success': data.get('ResponseCode') == '0'})
                return {'success': data.get('ResponseCode') == '0', 'data': data}
            logger.error('C2B registration failed', extra={'status': response.status_code})
            return {'success': False, 'error': response.text}
        except Exception as e:
            logger.error('C2B register error', extra={'error': str(e)})
            return {'success': False, 'error': str(e)}
    
    def parse_callback(self, payload):
        """Parse M-Pesa callback payload"""
        stk_callback = payload.get('Body', {}).get('stkCallback')
        if not stk_callback:
            return None
        
        return {
            'merchantRequestId': stk_callback.get('MerchantRequestID'),
            'checkoutRequestId': stk_callback.get('CheckoutRequestID'),
            'resultCode': stk_callback.get('ResultCode'),
            'resultDesc': stk_callback.get('ResultDesc'),
            'amount': next((item['Value'] for item in stk_callback.get('CallbackMetadata', {}).get('Item', []) if item.get('Name') == 'Amount'), None),
            'mpesaReceiptNumber': next((item['Value'] for item in stk_callback.get('CallbackMetadata', {}).get('Item', []) if item.get('Name') == 'MpesaReceiptNumber'), None),
            'transactionDate': next((item['Value'] for item in stk_callback.get('CallbackMetadata', {}).get('Item', []) if item.get('Name') == 'TransactionDate'), None),
            'phoneNumber': next((item['Value'] for item in stk_callback.get('CallbackMetadata', {}).get('Item', []) if item.get('Name') == 'PhoneNumber'), None),
        }


mpesa_service = MpesaService()
