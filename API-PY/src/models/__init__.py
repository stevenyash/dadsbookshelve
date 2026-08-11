from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Numeric, BigInteger, ForeignKey, LargeBinary, Date, PrimaryKeyConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import json

db = SQLAlchemy()

# Import all models to ensure they are registered with SQLAlchemy
from .newsletter import Newsletter
from .finance import FinanceTransaction


class Users(db.Model):
    __tablename__ = 'users'
    
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), default='customer')  # enum('customer','admin')
    telephone = Column(String(50))
    google_id = Column(String(100))
    account_status = Column(String(50), default='active')
    user_role_id = Column(Integer, ForeignKey('roles.role_id'))
    country_code = Column(String(50))
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    national_id = Column(String(50))
    reset_token = Column(String(100))
    reset_token_expires = Column(DateTime)
    b2h_referral_code = Column(String(50))

    # Relationships
    role = relationship('Roles', foreign_keys=[user_role_id], back_populates='users')
    orders = relationship('Orders', back_populates='user')
    marketers = relationship('Marketers', back_populates='user', uselist=False)
    reviews = relationship('Reviews', back_populates='user')
    clients = relationship('Clients', back_populates='user')
    book_purchases = relationship('BookPurchases', back_populates='user')
    payments = relationship('Payments', back_populates='user')
    readinghistory = relationship('Readinghistory', back_populates='user')
    devices = relationship('Devices', back_populates='user')
    userdevices = relationship('UserDevices', back_populates='user')
    # Note: membership - no FK in DB, handled manually
    consent = relationship('Consents', back_populates='user', uselist=False)
    # Note: dslibrary_payments table does NOT exist - use Payments table instead
# Note: ebook_payments table does NOT exist - removed
    ebook_uploader = relationship('EbookUploader', back_populates='user')
    referrals_referrer = relationship('Referrals', foreign_keys='Referrals.referrer_id', back_populates='referrer')
    referrals_referred = relationship('Referrals', foreign_keys='Referrals.referred_id', back_populates='referred')
    newsletter_subscriptions = relationship('NewsletterSubscriptions', back_populates='user')
    author_transactions = relationship('AuthorTransactions', back_populates='user')
    
    def to_dict(self):
        from src.models import PermissionModules, PermissionActions, RolePermissions, UserCustomPermissions
        
        permissions = {}
        
        # Get role permissions
        if self.role:
            role_perms = RolePermissions.query.filter_by(role_id=self.role.role_id).all()
            for rp in role_perms:
                module = PermissionModules.query.filter_by(module_id=rp.module_id).first()
                action = PermissionActions.query.filter_by(action_id=rp.action_id).first()
                if module and action and rp.is_granted:
                    if module.module_code not in permissions:
                        permissions[module.module_code] = []
                    # Use uppercase action code to match frontend expectations
                    action_code = action.action_code.upper() if action.action_code else None
                    if action_code and action_code not in permissions[module.module_code]:
                        permissions[module.module_code].append(action_code)
        
        custom_perms_list = []
        # Get custom permissions (not expired)
        custom_perms = UserCustomPermissions.query.filter(
            UserCustomPermissions.user_id == self.user_id,
            (UserCustomPermissions.expires_at == None) | (UserCustomPermissions.expires_at > datetime.utcnow())
        ).all()
        
        for cp in custom_perms:
            module = PermissionModules.query.filter_by(module_id=cp.module_id).first()
            action = PermissionActions.query.filter_by(action_id=cp.action_id).first()
            if module and action:
                action_code = action.action_code.upper() if action.action_code else None
                custom_perms_list.append({
                    'module_code': module.module_code,
                    'module_name': module.module_name,
                    'action_code': action_code,
                    'action_name': action.action_name,
                    'is_granted': cp.is_granted,
                    'expires_at': cp.expires_at.isoformat() if cp.expires_at else None,
                    'granted_by': cp.granted_by,
                })
                if module.module_code not in permissions:
                    permissions[module.module_code] = []
                if cp.is_granted and action_code and action_code not in permissions[module.module_code]:
                    permissions[module.module_code].append(action_code)
                elif not cp.is_granted and action_code and action_code in permissions.get(module.module_code, []):
                    permissions[module.module_code].remove(action_code)
        
        return {
            'user_id': self.user_id,
            'name': self.name,
            'email': self.email,
            'telephone': self.telephone,
            'account_status': self.account_status,
            'is_active': self.account_status == 'active',
            'user_role_id': self.user_role_id,
            'country_code': self.country_code,
            'b2h_referral_code': self.b2h_referral_code,
            'date_created': self.date_created.isoformat() if self.date_created else None,
            'role_code': self.role.role_code if self.role else None,
            'role_name': self.role.role_name if self.role else None,
            'permissions': permissions,
            'custom_permissions': custom_perms_list,
        }


class Roles(db.Model):
    __tablename__ = 'roles'
    
    role_id = Column(Integer, primary_key=True, autoincrement=True)
    role_name = Column(String(255), unique=True)
    role_code = Column(String(30), unique=True)  # admin, super_admin, customer
    parent_role_id = Column(Integer, ForeignKey('roles.role_id'))
    description = Column(String(255))
    is_system = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime)
    
    users = relationship('Users', back_populates='role')
    permissions = relationship('RolePermissions', back_populates='role')
    
    def to_dict(self):
        return {
            'role_id': self.role_id,
            'role_name': self.role_name,
            'role_code': self.role_code,
            'description': self.description,
            'sort_order': self.sort_order,
            'is_active': self.is_active,
        }


class Books(db.Model):
    __tablename__ = 'books'
    
    book_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    author = Column(String(255), nullable=False)
    genre_id = Column(Integer, ForeignKey('genres.genre_id'))
    isbn = Column(String(20), unique=True)
    price = Column(Numeric(10, 2), nullable=False)
    price_digital = Column(Numeric(10, 2))
    price_physical = Column(Numeric(10, 2))
    stock = Column(Integer, default=0)
    stock_digital = Column(Integer, default=999)
    stock_physical = Column(Integer, default=0)
    purchase_count = Column(Integer, default=0)
    published_date = Column(Date)
    image_url = Column(String(255))
    rate = Column(Integer)
    source = Column(String(50))
    overview = Column(Text)
    available = Column(Integer, default=3)  # bitmask: 1=shop, 2=library, 3=both
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    deleted = Column(DateTime)
    consent_id = Column(Integer)
    
    # Relationships
    genre = relationship('Genres', back_populates='books')
    order_items = relationship('OrderItems', back_populates='book')
    cart_items = relationship('CartItems', back_populates='book')
    reviews = relationship('Reviews', back_populates='book')
    inventory = relationship('Inventory', back_populates='book')
    readinghistory = relationship('Readinghistory', back_populates='book')
    sales_reports = relationship('SalesReports', back_populates='book')
    affiliate_links = relationship('AffiliateLinks', back_populates='book')
    book_purchases = relationship('BookPurchases', back_populates='book')
    author_transactions = relationship('AuthorTransactions', back_populates='book')
    borrowtransactions = relationship('Borrowtransactions', back_populates='book')
    featuredBooks = relationship('FeaturedBooks', back_populates='book')
    
    def to_dict(self):
        return {
            'book_id': self.book_id,
            'title': self.title,
            'author': self.author,
            'genre_id': self.genre_id,
            'isbn': self.isbn,
            'price': float(self.price) if self.price else None,
            'price_digital': float(self.price_digital) if self.price_digital else None,
            'price_physical': float(self.price_physical) if self.price_physical else None,
            'stock': self.stock,
            'stock_digital': self.stock_digital,
            'stock_physical': self.stock_physical,
            'purchase_count': self.purchase_count,
            'published_date': self.published_date.isoformat() if self.published_date else None,
            'image_url': self.image_url,
            'rate': self.rate,
            'source': self.source,
            'overview': self.overview,
            'available': self.available,
            'is_available': self.available is not None and self.available > 0,
            'in_shop': self.available in [1, 3] if self.available else False,
            'in_library': self.available in [2, 3] if self.available else False,
            'date_created': self.date_created.isoformat() if self.date_created else None,
            'genre': {'genre_name': self.genre.genre_name} if self.genre else None,
        }


class Genres(db.Model):
    __tablename__ = 'genres'
    
    genre_id = Column(Integer, primary_key=True, autoincrement=True)
    genre_name = Column(String(50), nullable=False)
    description = Column(Text)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    books = relationship('Books', back_populates='genre')
    affiliate_links = relationship('AffiliateLinks', back_populates='genre')


class Orders(db.Model):
    __tablename__ = 'orders'
    
    order_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    order_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default='pending')  # enum('pending','shipped','delivered','canceled')
    total_amount = Column(Numeric(10, 2), nullable=False)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship('Users', back_populates='orders')
    order_items = relationship('OrderItems', back_populates='order', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'order_id': self.order_id,
            'user_id': self.user_id,
            'order_date': self.order_date.isoformat() if self.order_date else None,
            'status': self.status,
            'total_amount': float(self.total_amount) if self.total_amount else None,
        }


class OrderItems(db.Model):
    __tablename__ = 'order_items'
    
    order_item_id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey('orders.order_id'))
    book_id = Column(Integer, ForeignKey('books.book_id'))
    quantity = Column(Integer, default=1)
    price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2))
    order_type = Column(String(50))
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    order = relationship('Orders', back_populates='order_items')
    book = relationship('Books', back_populates='order_items')


class Payments(db.Model):
    __tablename__ = 'payments'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default='KES')
    payment_method = Column(String(50), nullable=True)  # Allow null temporarily
    payment_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default='pending')
    reference = Column(String(100), nullable=False)
    checkout_request_id = Column(String(255))
    payment_metadata = Column(Text)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    user = relationship('Users', back_populates='payments')
    payment_items = relationship('PaymentItems', back_populates='payment')
    
    def to_dict(self):
        metadata = {}
        if self.payment_metadata:
            try:
                metadata = json.loads(self.payment_metadata) if isinstance(self.payment_metadata, str) else self.payment_metadata
                referral_code = metadata.get('referral_code') or metadata.get('referralCode')
                if referral_code:
                    metadata['referral_code'] = referral_code
                    metadata['referralCode'] = referral_code
            except:
                pass
        return {
            'id': self.id,
            'user_id': self.user_id,
            'amount': float(self.amount) if self.amount else None,
            'currency': self.currency,
            'payment_method': self.payment_method,
            'status': self.status,
            'reference': self.reference,
            'checkout_request_id': self.checkout_request_id,
            'metadata': metadata,
        }


class PaymentItems(db.Model):
    __tablename__ = 'payment_items'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    payment_id = Column(Integer, ForeignKey('payments.id'))
    item_id = Column(String(100))
    item_type = Column(String(50))
    amount = Column(Numeric(15, 2))
    quantity = Column(Integer, default=1)
    
    payment = relationship('Payments', back_populates='payment_items')


class CartItems(db.Model):
    __tablename__ = 'cart_items'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey('clients.id'))
    book_id = Column(Integer, ForeignKey('books.book_id'))
    quantity = Column(Integer, default=1)
    copy_type = Column(String(20))  # digital, physical
    price = Column(Numeric(10, 2), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    client = relationship('Clients', back_populates='cart_items')
    book = relationship('Books', back_populates='cart_items')


class Clients(db.Model):
    __tablename__ = 'clients'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(50))
    name = Column(String(50))
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    provider = Column(String(50))
    phone_number = Column(Integer)
    country_code = Column(String(50))
    user_id = Column(Integer, ForeignKey('users.user_id'), unique=True)
    
    user = relationship('Users', back_populates='clients')
    cart_items = relationship('CartItems', back_populates='client')


class BookPurchases(db.Model):
    __tablename__ = 'book_purchases'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    book_id = Column(Integer, ForeignKey('books.book_id'))
    book_format = Column(String(20))  # digital, physical
    payment_id = Column(Integer, ForeignKey('payments.id'))
    status = Column(String(20), default='pending')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship('Users', back_populates='book_purchases')
    book = relationship('Books', back_populates='book_purchases')


class Reviews(db.Model):
    __tablename__ = 'reviews'
    
    rate_id = Column(Integer, primary_key=True, autoincrement=True)
    rating = Column(Integer)
    book_id = Column(Integer, ForeignKey('books.book_id'))
    user_id = Column(Integer, ForeignKey('users.user_id'))
    
    book = relationship('Books', back_populates='reviews')
    user = relationship('Users', back_populates='reviews')


class Inventory(db.Model):
    __tablename__ = 'inventory'
    
    inventory_id = Column(Integer, primary_key=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey('books.book_id'))
    quantity_in = Column(Integer, default=0)
    quantity_out = Column(Integer, default=0)
    date = Column(DateTime, default=datetime.utcnow)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    book = relationship('Books', back_populates='inventory')


class Membership(db.Model):
    __tablename__ = 'membership'
    
    membership_id = Column(Integer, primary_key=True, autoincrement=True)
    member_name = Column(String(255))
    membership_status = Column(String(50), default='pending')
    join_date = Column(DateTime)
    subscription_type = Column(String(50))
    subscription_expiry = Column(DateTime)
    payment_id = Column(Integer, ForeignKey('payments.id'))
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    user_id = Column(String(50))  # DB uses varchar(50), no FK
    access_id = Column(String(50))  # DB uses varchar(50), no FK
    
    # No FK relationship - libraryaccess uses access_id as varchar
    borrowtransactions = relationship('Borrowtransactions', back_populates='membership')


class Libraryaccess(db.Model):
    __tablename__ = 'libraryaccess'
    
    access_id = Column(Integer, primary_key=True, autoincrement=True)
    access_type = Column(String(50))
    is_member = Column(Boolean)
    amount_kenya_shillings = Column(Numeric(10, 2))
    amount_usd = Column(Numeric(10, 2))
    amount_eur = Column(Numeric(10, 2))
    duration = Column(String(50))
    allowed_devices = Column(Integer, default=1)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    # No FK relationship with membership table


class Borrowtransactions(db.Model):
    __tablename__ = 'borrowtransactions'
    
    transaction_id = Column(Integer, primary_key=True, autoincrement=True)
    membership_id = Column(Integer, ForeignKey('membership.membership_id'))
    book_id = Column(Integer, ForeignKey('books.book_id'))
    borrow_date = Column(Date)
    return_date = Column(Date)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    membership = relationship('Membership', back_populates='borrowtransactions')
    book = relationship('Books', back_populates='borrowtransactions')


class Marketers(db.Model):
    __tablename__ = 'marketers'
    
    marketer_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), unique=True)
    referral_code = Column(String(50), unique=True)
    is_active = Column(Boolean, default=True)
    mpesa_phone = Column(String(20))
    commission_rate = Column(Numeric(5, 2), default=0.05)
    tier = Column(String(20), default='bronze')
    status = Column(String(20), default='active')
    total_earnings = Column(Numeric(12, 2), default=0.00)
    pending_payout = Column(Numeric(12, 2), default=0.00)
    total_paid = Column(Numeric(12, 2), default=0.00)
    total_referrals = Column(Integer, default=0)
    successful_referrals = Column(Integer, default=0)
    conversion_rate = Column(Numeric(5, 2), default=0)
    pending_earnings = Column(Numeric(12, 2), default=0.00)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    user = relationship('Users', back_populates='marketers')
    transactions = relationship('MarketerTransactions', back_populates='marketer')
    affiliate_links = relationship('AffiliateLinks', back_populates='marketer')
    commissions = relationship('Commission', back_populates='marketer')
    payout_requests = relationship('PayoutRequest', back_populates='marketer')
    points = relationship('MarketerPoints', back_populates='marketer')
    marketer_commission_rates = relationship('MarketerCommissionRate', back_populates='marketer')
    affiliate_referrals = relationship('AffiliateReferral', back_populates='marketer')
    marketer_point_history = relationship('MarketerPointHistory', back_populates='marketer')
    
    def to_dict(self):
        return {
            'id': self.marketer_id,
            'marketer_id': self.marketer_id,
            'user_id': self.user_id,
            'referralCode': self.referral_code,
            'isActive': self.is_active,
            'mpesaPhone': self.mpesa_phone,
            'commission_rate': float(self.commission_rate) if self.commission_rate else 0.05,
            'tier': self.tier,
            'status': self.status,
            'totalEarnings': float(self.total_earnings) if self.total_earnings else 0,
            'pendingPayout': float(self.pending_payout) if self.pending_payout else 0,
            'totalPaid': float(self.total_paid) if self.total_paid else 0,
            'totalReferrals': self.total_referrals or 0,
            'successfulReferrals': self.successful_referrals or 0,
            'conversionRate': float(self.conversion_rate) if self.conversion_rate else 0,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'user': {
                'id': self.user.user_id if self.user else None,
                'name': self.user.name if self.user else None,
                'email': self.user.email if self.user else None,
                'phone': self.user.telephone if self.user else None,
            } if self.user else None,
        }


class AffiliateLinks(db.Model):
    __tablename__ = 'affiliate_links'
    
    link_id = Column(Integer, primary_key=True, autoincrement=True)
    marketer_id = Column(Integer, ForeignKey('marketers.marketer_id'))
    book_id = Column(Integer, ForeignKey('books.book_id'))
    genre_id = Column(Integer, ForeignKey('genres.genre_id'))
    custom_url = Column(String(500))
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    marketer = relationship('Marketers', back_populates='affiliate_links')
    book = relationship('Books', back_populates='affiliate_links')
    genre = relationship('Genres', back_populates='affiliate_links')


class MarketerTransactions(db.Model):
    __tablename__ = 'marketer_transactions'
    
    transaction_id = Column(Integer, primary_key=True, autoincrement=True)
    marketer_id = Column(Integer, ForeignKey('marketers.marketer_id'))
    amount = Column(Numeric(12, 2))
    type = Column(String(20))  # commission, payout, bonus
    source = Column(String(50))
    reference_id = Column(Integer)
    status = Column(String(20), default='pending')
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    
    marketer = relationship('Marketers', back_populates='transactions')


class MarketerPoints(db.Model):
    __tablename__ = 'marketer_points'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    marketer_id = Column(Integer, ForeignKey('marketers.marketer_id'))
    points = Column(Integer, default=0)
    type = Column(String(50))
    description = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    marketer = relationship('Marketers', back_populates='points')


class Commission(db.Model):
    __tablename__ = 'commissions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    marketerId = Column(Integer, ForeignKey('marketers.marketer_id'))
    type = Column(String(50), nullable=False)  # commission type
    amount = Column(Numeric(10, 2), nullable=False)
    percentage = Column(Numeric(5, 2))
    saleAmount = Column(Numeric(10, 2))
    status = Column(String(20), default='pending')
    referenceType = Column(String(50))
    referenceId = Column(Integer)
    createdAt = Column(DateTime, default=datetime.utcnow)
    approvedAt = Column(DateTime)
    paidAt = Column(DateTime)
    
    marketer = relationship('Marketers', back_populates='commissions')


class PayoutRequest(db.Model):
    __tablename__ = 'payout_requests'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    marketerId = Column(Integer, ForeignKey('marketers.marketer_id'))
    amount = Column(Numeric(10, 2), nullable=False)
    method = Column(String(20), default='mpesa')
    status = Column(String(20), default='pending')
    mpesaPhone = Column(String(20))
    bankAccountName = Column(String(100))
    bankAccountNumber = Column(String(50))
    bankName = Column(String(100))
    transactionId = Column(String(100))
    rejectionReason = Column(Text)
    createdAt = Column(DateTime, default=datetime.utcnow)
    processedAt = Column(DateTime)
    completedAt = Column(DateTime)
    
    marketer = relationship('Marketers', back_populates='payout_requests')


class PermissionModules(db.Model):
    __tablename__ = 'permission_modules'
    
    module_id = Column(Integer, primary_key=True, autoincrement=True)
    module_name = Column(String(50), unique=True)
    module_code = Column(String(50), unique=True)
    description = Column(String(255))
    category = Column(String(50))
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PermissionActions(db.Model):
    __tablename__ = 'permission_actions'
    
    action_id = Column(Integer, primary_key=True, autoincrement=True)
    action_name = Column(String(50), unique=True)
    action_code = Column(String(50), unique=True)
    description = Column(String(255))
    sort_order = Column(Integer, default=0)


class RolePermissions(db.Model):
    __tablename__ = 'role_permissions'
    __table_args__ = (
        PrimaryKeyConstraint('role_id', 'module_id', 'action_id'),
    )
    
    role_id = Column(Integer, ForeignKey('roles.role_id'), primary_key=True)
    module_id = Column(Integer, ForeignKey('permission_modules.module_id'), primary_key=True)
    action_id = Column(Integer, ForeignKey('permission_actions.action_id'), primary_key=True)
    is_granted = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    role = relationship('Roles', back_populates='permissions')


class UserCustomPermissions(db.Model):
    __tablename__ = 'user_custom_permissions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    module_id = Column(Integer, ForeignKey('permission_modules.module_id'))
    action_id = Column(Integer, ForeignKey('permission_actions.action_id'))
    is_granted = Column(Boolean, default=True)
    granted_by = Column(Integer, ForeignKey('users.user_id'))
    expires_at = Column(DateTime)
    granted_at = Column(DateTime, default=datetime.utcnow)


class Readinghistory(db.Model):
    __tablename__ = 'readinghistory'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    device_id = Column(Integer, ForeignKey('devices.id'))
    book_id = Column(Integer, ForeignKey('books.book_id'))
    start_date = Column(String(19), default=lambda: datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'))
    end_date = Column(String(19))
    status = Column(String(20))  # enum('Reading','Completed','Abandoned','ReadingNow')
    rating = Column(Integer)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    currentChapter = Column(Integer, default=0)
    progress = Column(Integer, default=0)
    totalChapters = Column(Integer, default=0)
    
    user = relationship('Users', back_populates='readinghistory')
    device = relationship('Devices', back_populates='readinghistory')
    book = relationship('Books', back_populates='readinghistory')


class Devices(db.Model):
    __tablename__ = 'devices'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(255))
    platform = Column(String(255))
    is_rooted = Column(Boolean, default=False)
    is_jailbroken = Column(Boolean, default=False)
    security_status = Column(String(255))
    is_secure = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    device_name = Column(String(100))
    public_key_spki = Column(Text)
    
    user = relationship('Users', back_populates='devices')
    readinghistory = relationship('Readinghistory', back_populates='device')
    userdevices = relationship('UserDevices', back_populates='device')


class UserDevices(db.Model):
    __tablename__ = 'userdevices'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    device_id = Column(Integer, ForeignKey('devices.id'))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship('Users', back_populates='userdevices')
    device = relationship('Devices', back_populates='userdevices')


class SalesReports(db.Model):
    __tablename__ = 'sales_reports'
    
    report_id = Column(Integer, primary_key=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey('books.book_id'))
    month = Column(Date)
    quantity_sold = Column(Integer)
    total_revenue = Column(Numeric(10, 2))
    created_at = Column(DateTime, default=datetime.utcnow)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    book = relationship('Books', back_populates='sales_reports')


class Librarybooks(db.Model):
    __tablename__ = 'librarybooks'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    book_id = Column(String(50))
    soft_copy = Column(String(500))
    distribution_format = Column(String(20))  # epub, pdf
    readium_manifest = Column(String(500))
    book_keysignature = Column(String(10000))
    book_key = Column(String(1000))


class Authors(db.Model):
    __tablename__ = 'authors'
    
    author_id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(255))
    email = Column(String(255), unique=True)
    phone_number = Column(String(15))
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    sales_books = relationship('SalesBooks', back_populates='author')


class Publishers(db.Model):
    __tablename__ = 'publishers'
    
    publisher_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    address = Column(Text)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    publisher_payments = relationship('PublisherPayments', back_populates='publisher')


class AuthorTransactions(db.Model):
    __tablename__ = 'author_transactions'
    
    transaction_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    book_id = Column(Integer, ForeignKey('books.book_id'))
    amount = Column(Numeric(12, 2))
    type = Column(String(20))  # sale, royalty, payout
    description = Column(String(255))
    reference = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default='completed')
    
    user = relationship('Users', back_populates='author_transactions')
    book = relationship('Books', back_populates='author_transactions')


class Ads(db.Model):
    __tablename__ = 'ads'
    
    ad_id = Column(Integer, primary_key=True, autoincrement=True)
    ad_title = Column(String(255))
    ad_content = Column(Text)
    ad_image_url = Column(String(255))
    ad_type = Column(String(50))
    status = Column(String(20), default='active')
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    category_id = Column(Integer, ForeignKey('ad_categories.category_id'))
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    category = relationship('AdCategories', back_populates='ads')


class AdCategories(db.Model):
    __tablename__ = 'ad_categories'
    
    category_id = Column(Integer, primary_key=True, autoincrement=True)
    category_name = Column(String(255))
    description = Column(Text)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    ads = relationship('Ads', back_populates='category')


class AdDisplayLog(db.Model):
    __tablename__ = 'ad_display_log'
    
    log_id = Column(Integer, primary_key=True, autoincrement=True)
    ad_id = Column(Integer)
    display_time = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)


class AuthorWallets(db.Model):
    __tablename__ = 'author_wallets'
    
    wallet_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, unique=True)
    balance = Column(Numeric(12, 2), default=0.00)
    total_earned = Column(Numeric(12, 2), default=0.00)
    total_withdrawn = Column(Numeric(12, 2), default=0.00)
    last_updated = Column(DateTime, default=datetime.utcnow)


class Consents(db.Model):
    __tablename__ = 'consents'
    
    consent_id = Column(Integer, primary_key=True, autoincrement=True)
    revenue_sharing_percentage = Column(String(50))
    agreement_confirmation = Column(Boolean, default=False)
    ownership_declaration = Column(Boolean, default=False)
    consent_date = Column(DateTime)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    agreement = Column(String(1000))
    declaration = Column(String(1000))
    pre_publisher_url = Column(String(50))
    pre_publisher = Column(Integer)
    pre_publisher_name = Column(String(50))
    pre_publisher_isbn = Column(String(50))
    user_id = Column(Integer, ForeignKey('users.user_id'))
    e_signature_date = Column(DateTime, default=datetime.utcnow)
    e_signature = Column(Text)
    user_details_confirmation = Column(Integer, default=0)
    
    user = relationship('Users', back_populates='consent')


class DeviceBookKeys(db.Model):
    __tablename__ = 'device_book_keys'
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    device_id = Column(BigInteger)
    book_id = Column(BigInteger)
    wrapped_key = Column(LargeBinary(length=512))
    created_at = Column(DateTime, default=datetime.utcnow)


# Note: ebook_payments table does NOT exist - removed

class EbookPricing(db.Model):
    __tablename__ = 'ebook_pricing'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    KES = Column(String(50))
    USD = Column(String(50))
    EUR = Column(String(50))


class EbookUploader(db.Model):
    __tablename__ = 'ebook_uploader'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    book = Column(String(500))
    user_id = Column(Integer, ForeignKey('users.user_id'))
    final_copy = Column(String(500))
    readium_manifest = Column(String(255))
    date_uploaded = Column(String(50))
    payment_status = Column(String(50))
    payment_id = Column(String(50))
    status = Column(String(50))
    book_title = Column(String(500))
    isbn = Column(String(50))
    author = Column(String(50))
    cover_image = Column(String(500))
    
    user = relationship('Users', back_populates='ebook_uploader')
    
    def to_dict(self):
        return {
            'id': self.id,
            'book': self.book,
            'user_id': self.user_id,
            'final_copy': self.final_copy,
            'readium_manifest': self.readium_manifest,
            'date_uploaded': self.date_uploaded,
            'payment_status': self.payment_status,
            'payment_id': self.payment_id,
            'status': self.status,
            'book_title': self.book_title,
            'isbn': self.isbn,
            'author': self.author,
            'cover_image': self.cover_image,
        }


class ExchangeRates(db.Model):
    __tablename__ = 'exchange_rates'
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    base_currency = Column(String(3))
    target_currency = Column(String(3))
    rate = Column(Numeric(15, 6))
    last_updated = Column(DateTime, default=datetime.utcnow)


class IncomeReports(db.Model):
    __tablename__ = 'income_reports'
    
    report_id = Column(Integer, primary_key=True, autoincrement=True)
    report_month = Column(Date)
    total_sales = Column(Numeric(10, 2))
    total_income = Column(Numeric(10, 2))
    created_at = Column(DateTime, default=datetime.utcnow)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)


class Limitless(db.Model):
    __tablename__ = 'limitless'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    content = Column(Text)
    current = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class NewsletterSubscriptions(db.Model):
    __tablename__ = 'newsletter_subscriptions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    preferences = Column(Text)
    subscribed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default='subscribed')
    unsubscribe_token = Column(String(255))
    updated_at = Column(DateTime, default=datetime.utcnow)
    email = Column(String(50), nullable=False)
    
    user = relationship('Users', back_populates='newsletter_subscriptions')


class PaymentTypes(db.Model):
    __tablename__ = 'payment_types'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    type_name = Column(String(50))
    description = Column(String(255))
    date_created = Column(DateTime, default=datetime.utcnow)


class PublisherPayments(db.Model):
    __tablename__ = 'publisherpayments'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    publisher_id = Column(Integer, ForeignKey('publishers.publisher_id'))
    amount = Column(String(50))
    reference = Column(String(50))
    payment_date = Column(String(50))
    status = Column(String(50), default='pending')
    created_at = Column(DateTime, default=datetime.utcnow)
    
    publisher = relationship('Publishers', back_populates='publisher_payments')


class Pricelist(db.Model):
    __tablename__ = 'pricelist'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    service = Column(String(100))
    price = Column(String(50))
    description = Column(Text)


class PublishOrder(db.Model):
    __tablename__ = 'publish_order'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    soft_copy = Column(String(50))
    client_id = Column(String(50))
    upload_date = Column(String(50))
    status = Column(String(50))
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)


class PublishingBooks(db.Model):
    __tablename__ = 'publishing_books'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    book_title = Column(String(50))
    author = Column(String(50))
    hardcopy_price = Column(String(50))
    softcopy_price = Column(String(50))
    comments = Column(Text)
    consent_id = Column(String(50))
    isbn = Column(String(50))


class PublishingFee(db.Model):
    __tablename__ = 'publishing_fee'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    KES = Column(String(50))
    USD = Column(String(50))
    EUR = Column(String(50))


class Referrals(db.Model):
    __tablename__ = 'referrals'
    
    referral_id = Column(Integer, primary_key=True, autoincrement=True)
    referrer_id = Column(Integer, ForeignKey('users.user_id'))
    referred_id = Column(Integer, ForeignKey('users.user_id'))
    referral_code = Column(String(50))
    referral_source = Column(String(50))
    status = Column(String(20), default='pending')
    first_purchase_id = Column(Integer)
    first_purchase_amount = Column(Numeric(10, 2))
    commission_earned = Column(Numeric(10, 2), default=0.00)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    referrer = relationship('Users', foreign_keys=[referrer_id], back_populates='referrals_referrer')
    referred = relationship('Users', foreign_keys=[referred_id], back_populates='referrals_referred')


class SalesBooks(db.Model):
    __tablename__ = 'sales_books'
    
    book_id = Column(Integer, primary_key=True, autoincrement=True)
    author_id = Column(Integer, ForeignKey('authors.author_id'))
    title = Column(String(255))
    isbn = Column(String(20))
    proof_of_ownership_file = Column(String(255))
    copyright_holder = Column(String(255))
    copyright_registration_number = Column(String(50))
    previous_publisher_name = Column(String(255))
    previous_isbn = Column(String(20))
    current_online_listing = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    author = relationship('Authors', back_populates='sales_books')


class Settings(db.Model):
    __tablename__ = 'settings'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    paybill_no = Column(String(50))
    account_no = Column(String(50))
    buygoods_till = Column(String(50))
    no_of_sliders = Column(String(50))
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    publishing_rate = Column(String(50))
    publisher_declaration = Column(String(1000))
    publisher_agreement = Column(String(1000))
    app_version = Column(String(50))


class Donations(db.Model):
    __tablename__ = 'donations'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50))
    amount = Column(String(50))
    reference = Column(String(50))
    payment_date = Column(String(50))
    checkout_request_id = Column(String(50))
    currency = Column(String(50))
    details = Column(String(50))
    payment_type = Column(String(50))
    status = Column(String(50), default='pending')
    phone_number = Column(String(50))


class Sliders(db.Model):
    __tablename__ = 'sliders'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    image_url = Column(String(255))
    title = Column(String(50))
    description = Column(String(100))
    button_label = Column(String(50))
    button_action = Column(String(50))
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'image_url': self.image_url,
            'title': self.title,
            'description': self.description,
            'button_label': self.button_label,
            'button_action': self.button_action,
            'date_created': self.date_created.isoformat() if self.date_created else None,
            'date_updated': self.date_updated.isoformat() if self.date_updated else None,
        }


class CurrentSliders(db.Model):
    __tablename__ = 'current_sliders'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    slider_id = Column(String(50))
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    position = Column(Integer, default=0)
    
    def to_dict(self):
        return {
            'id': self.id,
            'slider_id': self.slider_id,
            'position': self.position,
            'date_created': self.date_created.isoformat() if self.date_created else None,
            'date_updated': self.date_updated.isoformat() if self.date_updated else None,
        }
    position = Column(Integer, default=0)


class FeaturedBooks(db.Model):
    __tablename__ = 'featured_books'
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey('books.book_id'))
    feature_date = Column(Date)
    status = Column(String(50), default='active')
    date_created = Column(DateTime, default=datetime.utcnow)
    date_updated = Column(DateTime, default=datetime.utcnow)
    position = Column(Integer, default=0)
    
    book = relationship('Books', back_populates='featuredBooks')
    
    def to_dict(self):
        return {
            'id': self.id,
            'book_id': self.book_id,
            'feature_date': self.feature_date.isoformat() if self.feature_date else None,
            'status': self.status,
            'position': self.position,
            'date_created': self.date_created.isoformat() if self.date_created else None,
        }


class Stories(db.Model):
    __tablename__ = 'stories'
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    topic = Column(String(255))
    title = Column(String(255))
    content = Column(Text)
    image_url = Column(String(255))
    date_created = Column(DateTime, default=datetime.utcnow)
    date_to_show = Column(Date)
    status = Column(String(100), default='1')
    date_updated = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'topic': self.topic,
            'title': self.title,
            'content': self.content,
            'image_url': self.image_url,
            'date_to_show': self.date_to_show.isoformat() if self.date_to_show else None,
            'status': self.status,
            'date_created': self.date_created.isoformat() if self.date_created else None,
        }


class CommissionRate(db.Model):
    __tablename__ = 'commission_rates'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    serviceType = Column(String(50), unique=True)
    name = Column(String(100), nullable=False)
    percentage = Column(Numeric(5, 2), nullable=False)
    flatFee = Column(Numeric(10, 2), default=0.00)
    minAmount = Column(Numeric(10, 2), default=0.00)
    maxAmount = Column(Numeric(10, 2), default=999999.00)
    isActive = Column(Boolean, default=True)


class MarketerCommissionRate(db.Model):
    __tablename__ = 'marketer_commission_rates'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    marketer_id = Column(Integer, ForeignKey('marketers.marketer_id'))
    tier = Column(String(50))
    rate = Column(Numeric(5, 2))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    marketer = relationship('Marketers', back_populates='marketer_commission_rates')


class AffiliateReferral(db.Model):
    __tablename__ = 'affiliate_referrals'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    marketerId = Column(Integer, ForeignKey('marketers.marketer_id'))
    referralCode = Column(String(50))
    isConverted = Column(Boolean, default=False)
    convertedAt = Column(DateTime)
    conversionType = Column(String(50))
    conversionId = Column(Integer)
    ipAddress = Column(String(50))
    userAgent = Column(Text)
    clickedAt = Column(DateTime, default=datetime.utcnow)
    
    # No FK to users table - referred user tracked via conversionId
    marketer = relationship('Marketers', back_populates='affiliate_referrals')


class MarketerPointHistory(db.Model):
    __tablename__ = 'marketer_point_history'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    marketer_id = Column(Integer, ForeignKey('marketers.marketer_id'))
    points = Column(Integer)
    type = Column(String(50))
    description = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    marketer = relationship('Marketers', back_populates='marketer_point_history')


class BookOfDay(db.Model):
    __tablename__ = 'book_of_day'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey('books.book_id'))
    featured_date = Column(Date)
    reason = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Carousel(db.Model):
    __tablename__ = 'carousel'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    image_url = Column(String(500), nullable=False)
    link_url = Column(String(500))
    button_text = Column(String(100))
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    created_by = Column(Integer, ForeignKey('users.user_id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class UserEffectivePermissions(db.Model):
    __tablename__ = 'user_effective_permissions'
    __table_args__ = {'extend_existing': True}
    
    user_id = Column(Integer, primary_key=True, default=0)
    user_name = Column(String(100), primary_key=True)
    role_id = Column(Integer, primary_key=True, default=0)
    role_name = Column(String(255), primary_key=True)
    module_id = Column(Integer, primary_key=True, default=0)
    module_name = Column(String(50))
    module_code = Column(String(30))
    action_id = Column(Integer, primary_key=True, default=0)
    action_code = Column(String(20))
    action_name = Column(String(50))
    is_granted = Column(String(4))
    permission_source = Column(String(6), default='role')


# Export all models for convenience
__all__ = [
    'db', 'Users', 'Roles', 'Books', 'Genres', 'Orders', 'OrderItems',
    'Payments', 'PaymentItems', 'CartItems', 'Clients', 'BookPurchases',
    'Reviews', 'Inventory', 'Membership', 'Libraryaccess', 'Borrowtransactions',
    'Marketers', 'AffiliateLinks', 'MarketerTransactions', 'MarketerPoints',
    'Commission', 'PayoutRequest', 'RolePermissions', 'PermissionModules',
    'PermissionActions', 'UserCustomPermissions', 'Readinghistory', 'Devices', 'UserDevices',
    'SalesReports', 'Librarybooks', 'Authors', 'Publishers', 'AuthorTransactions',
    'Ads', 'AdCategories', 'AdDisplayLog', 'AuthorWallets', 'Consents', 'DeviceBookKeys',
    # Note: DslibraryPayments and EbookPayments tables do NOT exist in database
    'EbookPricing', 'EbookUploader',
    'ExchangeRates', 'IncomeReports', 'Limitless', 'NewsletterSubscriptions',
    'PaymentTypes', 'PublisherPayments', 'Pricelist', 'PublishOrder',
    'PublishingBooks', 'PublishingFee', 'Referrals', 'SalesBooks', 'Settings',
    'Donations', 'Sliders', 'CurrentSliders', 'FeaturedBooks', 'Stories',
    'CommissionRate', 'MarketerCommissionRate', 'AffiliateReferral', 'MarketerPointHistory',
    'Newsletter', 'FinanceTransaction', 'BookOfDay', 'Carousel', 'UserEffectivePermissions'
]
