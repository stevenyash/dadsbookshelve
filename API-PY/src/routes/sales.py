from flask import Blueprint, request, jsonify
from src.models import db, SalesReports, SalesBooks, IncomeReports, ExchangeRates, Pricelist, PaymentTypes

# Sales Reports
salesreports_bp = Blueprint('salesreports', __name__)


@salesreports_bp.route('/index', methods=['GET'])
def index():
    month = request.args.get('month')
    query = SalesReports.query
    if month:
        query = query.filter_by(month=month)
    
    reports = query.order_by(SalesReports.created_at.desc()).all()
    return jsonify({
        'success': True,
        'records': [{'report_id': r.report_id, 'book_id': r.book_id, 'month': r.month.isoformat() if r.month else None, 'quantity_sold': r.quantity_sold, 'total_revenue': float(r.total_revenue) if r.total_revenue else None} for r in reports]
    })


# Sales Books
salesbooks_bp = Blueprint('salesbooks', __name__)


@salesbooks_bp.route('/index', methods=['GET'])
def index():
    author_id = request.args.get('author_id', type=int)
    query = SalesBooks.query
    if author_id:
        query = query.filter_by(author_id=author_id)
    
    books = query.order_by(SalesBooks.created_at.desc()).all()
    return jsonify({
        'success': True,
        'records': [{'book_id': b.book_id, 'title': b.title, 'author_id': b.author_id, 'isbn': b.isbn, 'copyright_holder': b.copyright_holder} for b in books]
    })


@salesbooks_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    book = SalesBooks(
        author_id=data.get('author_id'),
        title=data.get('title'),
        isbn=data.get('isbn'),
        proof_of_ownership_file=data.get('proof_of_ownership_file'),
        copyright_holder=data.get('copyright_holder'),
        copyright_registration_number=data.get('copyright_registration_number'),
        previous_publisher_name=data.get('previous_publisher_name'),
        previous_isbn=data.get('previous_isbn')
    )
    db.session.add(book)
    db.session.commit()
    return jsonify({'success': True, 'record': {'book_id': book.book_id}})


# Publication submission endpoints
from datetime import datetime
import os
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

def encrypt_file_aes(file_path, key):
    """Encrypt a file using AES-256-CBC"""
    with open(file_path, 'rb') as f:
        data = f.read()
    
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    
    # Pad data to block size
    block_size = 16
    padding_length = block_size - (len(data) % block_size)
    data += bytes([padding_length] * padding_length)
    
    encrypted = encryptor.update(data) + encryptor.finalize()
    
    return encrypted, iv


def encrypt_softcopy_file(source_path, book_id):
    """Encrypt softcopy file and return paths"""
    from src.helpers.uploader import app_config
    
    # Generate 32-byte (256-bit) encryption key
    encryption_key = os.urandom(32)
    
    # Ensure encrypted directory exists
    encrypted_dir = os.path.join(app_config.public_dir, 'uploads', 'encrypted')
    os.makedirs(encrypted_dir, exist_ok=True)
    
    # Encrypt the file
    encrypted_data, iv = encrypt_file_aes(source_path, encryption_key)
    
    # Save encrypted file
    encrypted_filename = f'book_{book_id}_{int(datetime.utcnow().timestamp())}.enc'
    encrypted_file_path = os.path.join(encrypted_dir, encrypted_filename)
    
    with open(encrypted_file_path, 'wb') as f:
        f.write(encrypted_data)
    
    return {
        'encrypted_path': f'uploads/encrypted/{encrypted_filename}',
        'encryption_key': base64.b64encode(encryption_key).decode('utf-8'),
        'iv': base64.b64encode(iv).decode('utf-8')
    }


@salesbooks_bp.route('/submit-softcopy-publication', methods=['POST'])
def submit_softcopy_publication():
    data = request.get_json()
    try:
        from src.models import Books
        publishing_books = data.get('publishingBooks', [])
        consent = data.get('consent', {})
        library_books = data.get('libraryBooks', [])
        
        if not publishing_books:
            return jsonify({'success': False, 'message': 'No book data provided'}), 400
        
        book_data = publishing_books[0]
        
        # Check if ISBN already exists
        isbn = book_data.get('isbn')
        existing = Books.query.filter_by(isbn=isbn).first()
        if existing:
            return jsonify({'success': False, 'message': 'ISBN already registered'}), 400
        
        # Parse values properly
        genre_id = book_data.get('genre_id')
        
        # Handle genre_id as object {value, label} or string or number
        if isinstance(genre_id, dict):
            genre_id = genre_id.get('value')
        if isinstance(genre_id, str):
            genre_id = int(genre_id) if genre_id.isdigit() else None
        elif isinstance(genre_id, int):
            pass
        else:
            genre_id = None
        
        softcopy_price = book_data.get('softcopy_price')
        if isinstance(softcopy_price, str):
            softcopy_price = float(softcopy_price) if softcopy_price.replace('.', '', 1).isdigit() else 0
        elif isinstance(softcopy_price, (int, float)):
            softcopy_price = float(softcopy_price)
        else:
            softcopy_price = 0
        
        # Get softcopy path from libraryBooks if provided
        soft_copy_path = None
        encryption_key = None
        iv = None
        book = None
        
        # Handle soft_copy - it might be a dict or string
        soft_copy_data = library_books[0].get('soft_copy') if library_books else None
        if isinstance(soft_copy_data, dict):
            soft_copy_path = soft_copy_data.get('fileurl') or soft_copy_data.get('path')
        elif isinstance(soft_copy_data, str):
            soft_copy_path = soft_copy_data
        else:
            soft_copy_path = None
        
        if soft_copy_path:
            # Encrypt the softcopy file
            from src.helpers.uploader import app_config
            full_path = os.path.join(app_config.public_dir, soft_copy_path)
            
            if os.path.exists(full_path):
                # Create book first to get ID
                book = Books(
                    title=str(book_data.get('book_title', '')),
                    author=str(book_data.get('author', '')),
                    genre_id=genre_id,
                    isbn=str(isbn) if isbn else None,
                    price=softcopy_price,
                    price_digital=softcopy_price,
                    image_url=str(book_data.get('image_url')) if book_data.get('image_url') else None,
                    overview=str(book_data.get('overview')) if book_data.get('overview') else None,
                    stock=999,
                    stock_digital=999,
                    available=3,
                )
                db.session.add(book)
                db.session.flush()
                
                # Encrypt and save
                try:
                    encrypt_result = encrypt_softcopy_file(full_path, book.book_id)
                    soft_copy_path = encrypt_result['encrypted_path']
                    encryption_key = encrypt_result['encryption_key']
                    iv = encrypt_result['iv']
                except Exception as encrypt_err:
                    print(f"Encryption failed: {encrypt_err}")
        
        # Create Books record if no file to encrypt
        if not book:
            book = Books(
                title=str(book_data.get('book_title', '')),
                author=str(book_data.get('author', '')),
                genre_id=genre_id,
                isbn=str(isbn) if isbn else None,
                price=softcopy_price,
                price_digital=softcopy_price,
                image_url=str(book_data.get('image_url')) if book_data.get('image_url') else None,
                overview=str(book_data.get('overview')) if book_data.get('overview') else None,
                stock=999,
                stock_digital=999,
                available=3,
            )
            db.session.add(book)
        
        db.session.commit()
        
        # Send notifications
        try:
            send_submission_notifications(
                consent.get('user_email', ''),
                consent.get('user_name', ''),
                consent.get('user_phone', ''),
                book_data.get('book_title', ''),
                isbn,
                softcopy_price,
                'softcopy'
            )
        except Exception as notify_err:
            print(f"Notification error: {notify_err}")
        
        return jsonify({
            'success': True, 
            'message': 'Book submitted for softcopy publication', 
            'record': {
                'book_id': book.book_id,
                'soft_copy': soft_copy_path,
                'encryption_key': encryption_key,
                'iv': iv
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


def send_submission_notifications(user_email, user_name, user_phone, book_title, book_isbn, price, pub_type):
    """Send email and SMS notifications after successful book submission"""
    is_softcopy = pub_type == 'softcopy'
    type_label = "Softcopy" if is_softcopy else "Hardcopy"
    type_desc = "soft copy" if is_softcopy else "hard copy"
    admin_email = 'info@dadsbookshelves.co.ke'
    
    # Email to user
    try:
        from src.services.email import EmailService
        email_svc = EmailService()
        user_subject = f'Thank You for Your {type_label} Submission'
        user_body = f'''
        <p>Dear {user_name},</p>
        <p>We have received your {type_desc} submission.</p>
        <p><strong>Title:</strong> {book_title}<br>
        <strong>ISBN:</strong> {book_isbn}<br>
        <strong>Price:</strong> KES {price}</p>
        <p>Our team will contact you regarding the next steps.</p>
        <p>For inquiries: info@dadsbookshelves.co.ke | 0722310358</p>
        <p>Best regards,<br>DBS Team</p>
        '''
        email_svc.send_email(user_email, user_subject, user_body)
    except Exception as e:
        print(f"User email failed: {e}")
    
    # Email to admin
    try:
        from src.services.email import EmailService
        email_svc = EmailService()
        admin_subject = f'New {type_label} Submission: {book_title}'
        action_required = "Process for publication" if is_softcopy else "Arrange physical copy collection"
        type_book = "softcopy book" if is_softcopy else "hardcopy submission"
        phone_line = f"- Phone: {user_phone}<br>" if user_phone else ""
        admin_body = f'''
        <p>Hello,</p>
        <p>A new {type_book} has been received:</p>
        <p><strong>Title:</strong> {book_title}<br>
        <strong>ISBN:</strong> {book_isbn}<br>
        <strong>Price:</strong> KES {price}</p>
        <p><strong>Action Required:</strong> {action_required}</p>
        <p>Submitter:<br>
        - Name: {user_name}<br>
        - Email: {user_email}<br>
        {phone_line}
        </p>
        '''
        email_svc.send_email(admin_email, admin_subject, admin_body)
    except Exception as e:
        print(f"Admin email failed: {e}")
    
    # SMS to user
    if user_phone:
        try:
            from src.services.sms import SmsService
            sms_svc = SmsService()
            sms_svc.send_sms(user_phone, "Thank you for giving us the opportunity to serve you! DBS: Books without boundaries!")
        except Exception as e:
            print(f"User SMS failed: {e}")
    
    # SMS to admin
    try:
        from src.services.sms import SmsService
        sms_svc = SmsService()
        admin_phone = '0722310358'
        type_label = "Softcopy" if is_softcopy else "Hardcopy"
        admin_msg = f"NEW SUBMISSION: {book_title} ({type_label})\nFrom: {user_name}"
        sms_svc.send_sms(admin_phone, admin_msg)
    except Exception as e:
        print(f"Admin SMS failed: {e}")


@salesbooks_bp.route('/submit-hardcopy-publication', methods=['POST'])
def submit_hardcopy_publication():
    data = request.get_json()
    try:
        from src.models import Books
        publishing_books = data.get('publishingBooks', [])
        consent = data.get('consent', {})
        
        if not publishing_books:
            return jsonify({'success': False, 'message': 'No book data provided'}), 400
        
        book_data = publishing_books[0]
        
        # Check if ISBN already exists
        isbn = book_data.get('isbn')
        existing = Books.query.filter_by(isbn=isbn).first()
        if existing:
            return jsonify({'success': False, 'message': 'ISBN already registered'}), 400
        
        # Parse values properly
        genre_id = book_data.get('genre_id')
        
        # Handle genre_id as object {value, label} or string or number
        if isinstance(genre_id, dict):
            genre_id = genre_id.get('value')
        if isinstance(genre_id, str):
            genre_id = int(genre_id) if genre_id.isdigit() else None
        elif isinstance(genre_id, int):
            pass  # keep as is
        else:
            genre_id = None
        
        hardcopy_price = book_data.get('hardcopy_price')
        if isinstance(hardcopy_price, str):
            hardcopy_price = float(hardcopy_price) if hardcopy_price.replace('.', '', 1).isdigit() else 0
        elif isinstance(hardcopy_price, (int, float)):
            hardcopy_price = float(hardcopy_price)
        else:
            hardcopy_price = 0
        
        # Create Books record
        book = Books(
            title=str(book_data.get('book_title', '')),
            author=str(book_data.get('author', '')),
            genre_id=genre_id,
            isbn=str(isbn) if isbn else None,
            price=hardcopy_price,
            price_physical=hardcopy_price,
            image_url=str(book_data.get('image_url')) if book_data.get('image_url') else None,
            overview=str(book_data.get('overview')) if book_data.get('overview') else None,
            stock=1,
            stock_physical=1,
            available=1,  # shop only for hardcopy
        )
        db.session.add(book)
        db.session.commit()
        
        # Send notifications
        try:
            send_submission_notifications(
                consent.get('user_email', ''),
                consent.get('user_name', ''),
                consent.get('user_phone', ''),
                book_data.get('book_title', ''),
                isbn,
                hardcopy_price,
                'hardcopy'
            )
        except Exception as notify_err:
            print(f"Notification error: {notify_err}")
        
        return jsonify({'success': True, 'message': 'Book submitted for hardcopy publication', 'record': {'book_id': book.book_id}})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# Income Reports
incomereports_bp = Blueprint('incomereports', __name__)


@incomereports_bp.route('/index', methods=['GET'])
def index():
    reports = IncomeReports.query.order_by(IncomeReports.created_at.desc()).all()
    return jsonify({
        'success': True,
        'records': [{'report_id': r.report_id, 'report_month': r.report_month.isoformat() if r.report_month else None, 'total_sales': float(r.total_sales) if r.total_sales else None, 'total_income': float(r.total_income) if r.total_income else None} for r in reports]
    })


# Exchange Rates
exchangerates_bp = Blueprint('exchangerates', __name__)


@exchangerates_bp.route('/index', methods=['GET'])
def index():
    base = request.args.get('base', 'KES')
    rates = ExchangeRates.query.filter_by(base_currency=base).all()
    return jsonify({
        'success': True,
        'records': [{'id': r.id, 'base_currency': r.base_currency, 'target_currency': r.target_currency, 'rate': float(r.rate) if r.rate else None, 'last_updated': r.last_updated.isoformat() if r.last_updated else None} for r in rates]
    })


@exchangerates_bp.route('/view/<from_currency>/<to_currency>', methods=['GET'])
def view_rate(from_currency, to_currency):
    rate = ExchangeRates.query.filter_by(base_currency=from_currency.upper(), target_currency=to_currency.upper()).first()
    if not rate:
        return jsonify({'success': False, 'error': 'Exchange rate not found'}), 404
    return jsonify({
        'success': True,
        'record': {
            'id': rate.id,
            'base_currency': rate.base_currency,
            'target_currency': rate.target_currency,
            'rate': float(rate.rate) if rate.rate else None,
            'last_updated': rate.last_updated.isoformat() if rate.last_updated else None
        }
    })


@exchangerates_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    rate = ExchangeRates(
        base_currency=data.get('base_currency'),
        target_currency=data.get('target_currency'),
        rate=data.get('rate')
    )
    db.session.add(rate)
    db.session.commit()
    return jsonify({'success': True, 'record': {'id': rate.id}})


# Pricelist
pricelist_bp = Blueprint('pricelist', __name__)


@pricelist_bp.route('/index', methods=['GET'])
def index():
    items = Pricelist.query.all()
    return jsonify({
        'success': True,
        'records': [{'id': p.id, 'service': p.service, 'price': p.price, 'description': p.description} for p in items]
    })


@pricelist_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    item = Pricelist(service=data.get('service'), price=data.get('price'), description=data.get('description'))
    db.session.add(item)
    db.session.commit()
    return jsonify({'success': True, 'record': {'id': item.id}})


# Payment Types
paymenttypes_bp = Blueprint('paymenttypes', __name__)


@paymenttypes_bp.route('/index', methods=['GET'])
def index():
    types = PaymentTypes.query.all()
    return jsonify({
        'success': True,
        'records': [{'id': t.id, 'type_name': t.type_name, 'description': t.description} for t in types]
    })


@paymenttypes_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    ptype = PaymentTypes(type_name=data.get('type_name'), description=data.get('description'))
    db.session.add(ptype)
    db.session.commit()
    return jsonify({'success': True, 'record': {'id': ptype.id}})
