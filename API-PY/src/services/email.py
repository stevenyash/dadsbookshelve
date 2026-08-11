import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional


class EmailService:
    def __init__(self):
        self.config = {
            'host': os.getenv('MAIL_HOST', 'smtp.gmail.com'),
            'port': int(os.getenv('MAIL_PORT', '587')),
            'username': os.getenv('MAIL_USER'),
            'password': os.getenv('MAIL_PASS'),
            'sender_name': os.getenv('MAIL_SENDER_NAME', 'DADS Bookshelves'),
            'sender_email': os.getenv('MAIL_SENDER_EMAIL', 'noreply@dadsbookshelves.co.ke'),
        }
    
    def send_email(self, to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> dict:
        """Send email to recipient"""
        if not self.config['username'] or not self.config['password']:
            print(f'[EMAIL] Development mode - would send to: {to_email}')
            print(f'[EMAIL] Subject: {subject}')
            print(f'[EMAIL] Body preview: {html_body[:200]}...')
            return {'success': True, 'message': 'dev-mode'}
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f'{self.config["sender_name"]} <{self.config["sender_email"]}>'
            msg['To'] = to_email
            
            # Plain text part
            if text_body:
                msg.attach(MIMEText(text_body, 'plain'))
            
            # HTML part
            msg.attach(MIMEText(html_body, 'html'))
            
            # Connect to server and send
            server = smtplib.SMTP(self.config['host'], self.config['port'])
            server.starttls()
            server.login(self.config['username'], self.config['password'])
            server.sendmail(self.config['sender_email'], to_email, msg.as_string())
            server.quit()
            
            print(f'[EMAIL] Sent to {to_email}: {subject}')
            return {'success': True, 'message': 'sent'}
        except Exception as e:
            print(f'[EMAIL] Failed to send: {e}')
            return {'success': False, 'error': str(e)}
    
    def send_welcome_email(self, to_email: str, name: str) -> dict:
        """Send welcome email to new users"""
        subject = 'Welcome to DADS Bookshelves!'
        html = f'''
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome to DADS Bookshelves, {name}!</h2>
            <p>Thank you for joining us. You now have access to:</p>
            <ul>
                <li>Browse and purchase books</li>
                <li>Library subscription for digital reading</li>
                <li>Ebook conversion service</li>
            </ul>
            <p>Start exploring at <a href="http://localhost:5173">DADS Bookshelves</a></p>
            <br>
            <p>Best regards,<br>DADS Bookshelves Team</p>
        </body>
        </html>
        '''
        return self.send_email(to_email, subject, html)
    
    def send_payment_confirmation(self, to_email: str, amount: float, currency: str, reference: str) -> dict:
        """Send payment confirmation email"""
        subject = f'Payment Confirmation - {reference}'
        html = f'''
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Payment Successful!</h2>
            <p>Your payment has been processed successfully.</p>
            <table style="border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{currency} {amount}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reference</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{reference}</td></tr>
            </table>
            <p>Thank you for your purchase!</p>
        </body>
        </html>
        '''
        return self.send_email(to_email, subject, html)


email_service = EmailService()