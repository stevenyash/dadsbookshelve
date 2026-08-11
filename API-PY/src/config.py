import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

flask_env = os.getenv('FLASK_ENV', 'development')
if flask_env == 'production':
    load_dotenv('.env.production', override=True)
else:
    load_dotenv('.env.development', override=True)

class Config:
    SECRET_KEY = os.getenv('JWT_SECRET', 'your-secret-key-here')
    
    # App
    APP_NAME = 'DADS BOOKSHELVES (DBS)'
    APP_URL = os.getenv('APP_URL', 'http://localhost:5000')
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    PORT = int(os.getenv('PORT', '5000'))
    
    # Database
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', '3306'))
    DB_NAME = os.getenv('DB_NAME', 'dadsbookshelves')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASS = os.getenv('DB_PASS', '')
    
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET', 'your-super-secret-jwt-key-change-this')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=60)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_IDENTITY_CLAIM = 'sub'
    
    # Upload
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'uploads')
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB
    
    # CORS
    CORS_ORIGINS = os.getenv('FRONTEND_URL', 'http://localhost:5173').split(',')
    
    # Mail
    MAIL_USERNAME = os.getenv('MAIL_USER')
    MAIL_PASSWORD = os.getenv('MAIL_PASS')
    MAIL_SENDER_NAME = os.getenv('MAIL_SENDER_NAME', 'DADS Bookshelves')
    MAIL_HOST = os.getenv('MAIL_HOST', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', '587'))
    
    # M-Pesa
    MPESA_ENVIRONMENT = os.getenv('MPESA_ENVIRONMENT', 'sandbox')
    MPESA_CONSUMER_KEY = os.getenv('MPESA_CONSUMER_KEY')
    MPESA_CONSUMER_SECRET = os.getenv('MPESA_CONSUMER_SECRET')
    MPESA_BUSINESS_SHORTCODE = os.getenv('MPESA_BUSINESS_SHORTCODE')
    MPESA_PASSKEY = os.getenv('MPESA_PASSKEY')
    MPESA_CALLBACK_URL = os.getenv('MPESA_CALLBACK_URL')
    MPESA_INITIATOR_NAME = os.getenv('MPESA_INITIATOR_NAME')
    MPESA_INITIATOR_PASSWORD = os.getenv('MPESA_INITIATOR_PASSWORD')
    
    # PayPal
    PAYPAL_MODE = os.getenv('PAYPAL_MODE', 'sandbox')
    PAYPAL_CLIENT_ID = os.getenv('PAYPAL_CLIENT_ID')
    PAYPAL_CLIENT_SECRET = os.getenv('PAYPAL_CLIENT_SECRET')
    PAYPAL_RETURN_URL = os.getenv('PAYPAL_RETURN_URL')
    PAYPAL_CANCEL_URL = os.getenv('PAYPAL_CANCEL_URL')
    
    # S3
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
    AWS_BUCKET = os.getenv('AWS_BUCKET')

    # B2H Integration
    B2H_API_KEY = os.getenv('B2H_API_KEY')
    B2H_WEBHOOK_SECRET = os.getenv('B2H_WEBHOOK_SECRET')
    B2H_API_BASE = os.getenv('B2H_API_BASE', 'https://b2h-api.example.com/api')
    B2H_PLATFORM_ID = os.getenv('B2H_PLATFORM_ID', '3ee6c447-128f-46fa-b248-7f7e90d59d38')
    B2H_PLATFORM_IDENTIFIER = os.getenv('B2H_PLATFORM_IDENTIFIER', 'BITS_DADS_BOOKSHELVES')


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
