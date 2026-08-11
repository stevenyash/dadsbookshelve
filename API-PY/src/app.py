from flask import Flask, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import datetime
import os
import logging

from src.models import db
jwt = JWTManager()
logger = logging.getLogger(__name__)


def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    from src.config import config
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, 
        resources={r"/api/*": {"origins": ["http://localhost:5173", "http://localhost:3000", "http://localhost:1420", "http://127.0.0.1:1420", "*"]}},
        allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Origin", "X-Requested-With"],
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        expose_headers=["Content-Length", "X-Requested-With"]
    )
    
    # Handle preflight OPTIONS requests - must return 200, not redirect
    @app.before_request
    def handle_options():
        if request.method == 'OPTIONS':
            return '', 200, {
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Max-Age': '3600'
            }
    
    @app.after_request
    def add_cors_headers(response):
        if request.method == 'OPTIONS':
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
            response.headers['Access-Control-Max-Age'] = '3600'
        if request.origin:
            response.headers['Access-Control-Allow-Origin'] = request.origin
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
            response.headers['Access-Control-Max-Age'] = '3600'
        return response
    
    # Serve uploaded files directly
    @app.route('/uploads/<path:filename>')
    def serve_uploads(filename):
        from flask import send_from_directory, make_response
        import os
        from src.helpers.uploader import app_config
        upload_dir = os.path.join(app_config.public_dir, 'uploads')
        response = make_response(send_from_directory(upload_dir, filename))
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
    
    # Serve encrypted files
    @app.route('/uploads/encrypted/<path:filename>')
    def serve_encrypted(filename):
        from flask import send_from_directory, make_response, jsonify
        import os
        from src.helpers.uploader import app_config
        
        # Normalize filename - replace forward slashes with os path separator
        normalized_filename = os.path.basename(filename.replace('/', os.sep))
        
        # Check multiple possible locations
        possible_paths = [
            os.path.join(app_config.public_dir, 'uploads', 'encrypted', normalized_filename),
            os.path.join(app_config.public_dir, 'uploads', 'files', 'encrypted', normalized_filename),
        ]
        
        # Debug: print all files in encrypted directory
        enc_dir = os.path.join(app_config.public_dir, 'uploads', 'encrypted')
        if os.path.exists(enc_dir):
            all_files = os.listdir(enc_dir)
            print(f"DEBUG: All files in encrypted dir: {all_files}")
        
        for path in possible_paths:
            print(f"DEBUG: Checking path: {path}, exists: {os.path.exists(path)}")
            if os.path.exists(path):
                dir_path = os.path.dirname(path)
                file_name = os.path.basename(path)
                response = make_response(send_from_directory(dir_path, file_name))
                response.headers['Access-Control-Allow-Origin'] = '*'
                return response
        
        # For development/testing: if file not found, return a placeholder response
        # This allows testing the reader UI even without encrypted files
        return jsonify({
            'error': 'File not found',
            'filename': filename,
            'possible_filename': normalized_filename,
            'available_files': all_files if os.path.exists(enc_dir) else []
        }), 404
    
    # Health check
    @app.route('/health')
    def health():
        return {'status': 'ok', 'timestamp': datetime.utcnow().isoformat()}
    
    @app.route('/debug-libraryaccess')
    def debug_libraryaccess():
        try:
            from src.models import Libraryaccess
            packages = Libraryaccess.query.all()
            return {'success': True, 'count': len(packages), 'packages': [{'access_id': p.access_id, 'access_type': p.access_type} for p in packages]}
        except Exception as e:
            import traceback
            return {'success': False, 'error': str(e), 'trace': traceback.format_exc()}
    
    # Register blueprints - Core
    from src.routes.auth import auth_bp
    from src.routes.books import books_bp
    from src.routes.users import users_bp
    from src.routes.orders import orders_bp
    from src.routes.payments import payments_bp
    from src.routes.genres import genres_bp
    from src.routes.home import home_bp
    
    # Register blueprints - Additional (public or auth-protected)
    from src.routes.marketers import marketers_bp
    from src.routes.authors import authors_bp
    from src.routes.publishers import publishers_bp
    from src.routes.sliders import sliders_bp, currentsliders_bp
    from src.routes.stories import stories_bp, featuredbooks_bp
    from src.routes.memberships import memberships_bp, libraryaccess_bp, borrowtransactions_bp
    from src.routes.cart import cartitems_bp
    from src.routes.reviews import reviews_bp, inventory_bp, librarybooks_bp
    from src.routes.settings import settings_bp, donations_bp, settings_roles_bp
    from src.routes.affiliate import affiliates_bp, referrals_bp, affiliate_referral_bp
    from src.routes.devices import readinghistory_bp, devices_bp, userdevices_bp
    from src.routes.consents import consents_bp, newsletter_bp, limitless_bp
    from src.routes.permissions import perm_roles_bp, perm_modules_bp, perm_actions_bp, role_perms_bp, user_perms_bp
    from src.routes.sales import salesreports_bp, salesbooks_bp, incomereports_bp, exchangerates_bp, pricelist_bp, paymenttypes_bp
    from src.routes.components import components_bp
    from src.routes.book_of_day_admin import book_of_day_admin_bp
    from src.routes.dslibrarypayments import dslibrarypayments_bp
    from src.routes.ebookuploader import ebookuploader_bp
    from src.routes.ebook_jobs import ebook_jobs_bp
    from src.routes.file import file_bp
    from src.routes.b2h import b2h_bp
    
    # Validate B2H configuration at startup
    from src.services.b2h import b2h_service
    if not b2h_service.is_configured() or not b2h_service.webhook_secret:
        missing = []
        if not b2h_service.api_key:
            missing.append('B2H_API_KEY')
        if not b2h_service.webhook_secret:
            missing.append('B2H_WEBHOOK_SECRET')
        if not b2h_service.api_base:
            missing.append('B2H_API_BASE')
        if not b2h_service.platform_id:
            missing.append('B2H_PLATFORM_ID')
        msg = f'B2H integration not fully configured — missing env vars: {", ".join(missing)}'
        if config_name == 'production':
            raise RuntimeError(msg)
        logger.warning(msg)

    # New Admin Management Routes (admin/super_admin only - role protected + permission checks in frontend)
    from src.routes.newsletter_admin import newsletter_admin_bp
    from src.routes.finance import finance_admin_bp
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(books_bp, url_prefix='/api/books')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    app.register_blueprint(genres_bp, url_prefix='/api/genres')
    app.register_blueprint(home_bp, url_prefix='/api/home')
    
    # Public/Additional routes
    app.register_blueprint(marketers_bp, url_prefix='/api/marketers')
    app.register_blueprint(authors_bp, url_prefix='/api/authors')
    app.register_blueprint(publishers_bp, url_prefix='/api/publishers')
    app.register_blueprint(sliders_bp, url_prefix='/api/sliders')
    app.register_blueprint(currentsliders_bp, url_prefix='/api/currentsliders')
    app.register_blueprint(stories_bp, url_prefix='/api/stories')
    app.register_blueprint(featuredbooks_bp, url_prefix='/api/featuredbooks')
    app.register_blueprint(memberships_bp, url_prefix='/api/membership')
    app.register_blueprint(libraryaccess_bp, url_prefix='/api/libraryaccess')
    app.register_blueprint(borrowtransactions_bp, url_prefix='/api/borrowtransactions')
    app.register_blueprint(cartitems_bp, url_prefix='/api/cartitems')
    app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
    app.register_blueprint(librarybooks_bp, url_prefix='/api/librarybooks')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(donations_bp, url_prefix='/api/donations')
    app.register_blueprint(settings_roles_bp, url_prefix='/api/settings/roles')
    app.register_blueprint(affiliates_bp, url_prefix='/api/affiliates')
    app.register_blueprint(referrals_bp, url_prefix='/api/referrals')
    app.register_blueprint(affiliate_referral_bp, url_prefix='/api/affiliate_referral')
    app.register_blueprint(readinghistory_bp, url_prefix='/api/readinghistory')
    app.register_blueprint(devices_bp, url_prefix='/api/devices')
    app.register_blueprint(userdevices_bp, url_prefix='/api/userdevices')
    app.register_blueprint(consents_bp, url_prefix='/api/consents')
    app.register_blueprint(newsletter_bp, url_prefix='/api/newslettersubscriptions')
    app.register_blueprint(limitless_bp, url_prefix='/api/limitless')
    app.register_blueprint(perm_roles_bp, url_prefix='/api/roles')
    app.register_blueprint(perm_modules_bp, url_prefix='/api/permission_modules')
    app.register_blueprint(perm_actions_bp, url_prefix='/api/permission_actions')
    app.register_blueprint(role_perms_bp, url_prefix='/api/role_permissions')
    app.register_blueprint(user_perms_bp, url_prefix='/api/user_custom_permissions')
    app.register_blueprint(salesreports_bp, url_prefix='/api/salesreports')
    app.register_blueprint(salesbooks_bp, url_prefix='/api/salesbooks')
    app.register_blueprint(incomereports_bp, url_prefix='/api/incomereports')
    app.register_blueprint(exchangerates_bp, url_prefix='/api/exchangerates')
    app.register_blueprint(pricelist_bp, url_prefix='/api/pricelist')
    app.register_blueprint(paymenttypes_bp, url_prefix='/api/payment_types')
    app.register_blueprint(dslibrarypayments_bp, url_prefix='/api/dslibrarypayments')
    app.register_blueprint(ebookuploader_bp, url_prefix='/api/ebookuploader')
    app.register_blueprint(ebook_jobs_bp, url_prefix='/api/ebook-jobs')
    app.register_blueprint(file_bp, url_prefix='/api/file')
    app.register_blueprint(b2h_bp, url_prefix='/api/b2h')
    app.register_blueprint(components_bp, url_prefix='/api')
    app.register_blueprint(book_of_day_admin_bp, url_prefix='/api/admin')
    
    # New Admin Management Routes (admin/super_admin only)
    app.register_blueprint(newsletter_admin_bp, url_prefix='/api/admin/newsletters')
    app.register_blueprint(finance_admin_bp, url_prefix='/api/admin/finance')
    @app.errorhandler(404)
    def not_found(e):
        return {'success': False, 'error': 'The requested resource was not found'}, 404
    
    @app.errorhandler(500)
    def server_error(e):
        return {'success': False, 'error': 'An error occurred. Please try again later'}, 500
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        import traceback
        error_msg = str(e)
        
        if 'Too many connections' in error_msg:
            return {'success': False, 'error': 'Server is busy. Please try again later.'}, 503
        
        import os
        if os.getenv('FLASK_ENV') == 'production':
            return {'success': False, 'error': 'An error occurred. Please try again later.'}, 500
        
        traceback.print_exc()
        return {'success': False, 'error': error_msg}, 500
    
    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
