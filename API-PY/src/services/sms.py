import os
import requests
from typing import Optional


class SmsService:
    def __init__(self):
        self.config = {
            'api_url': os.getenv('SMS_API_URL'),
            'api_key': os.getenv('SMS_API_KEY'),
            'sender_id': os.getenv('SMS_SENDER_ID', 'DBShelves'),
        }
    
    def send_sms(self, phone: str, message: str) -> dict:
        """Send SMS to recipient"""
        if not self.config['api_url'] or not self.config['api_key']:
            print(f'[SMS] Development mode - would send to: {phone}')
            print(f'[SMS] Message: {message}')
            return {'success': True, 'message': 'dev-mode'}
        
        try:
            response = requests.post(
                self.config['api_url'],
                json={
                    'senderID': self.config['sender_id'],
                    'message': message,
                    'phone': phone,
                },
                headers={
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.config["api_key"]}',
                }
            )
            
            if response.status_code == 200:
                print(f'[SMS] Sent to {phone}: {message[:50]}...')
                return {'success': True, 'data': response.json()}
            else:
                return {'success': False, 'error': f'SMS failed: {response.text}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def send_otp(self, phone: str, otp: str) -> dict:
        """Send OTP code"""
        message = f'Your DADS Bookshelves verification code is: {otp}'
        return self.send_sms(phone, message)
    
    def send_payment_link(self, phone: str, amount: float, reference: str) -> dict:
        """Send payment link via SMS"""
        message = f'DADS Bookshelves: Complete your payment of KES {amount}. Reference: {reference}'
        return self.send_sms(phone, message)


sms_service = SmsService()