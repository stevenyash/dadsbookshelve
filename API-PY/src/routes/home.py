from flask import Blueprint, jsonify, request
from datetime import datetime
from flask_jwt_extended import get_jwt_identity, jwt_required
from src.models import db, Users, Roles, Orders, Membership, EbookUploader, BookPurchases, Readinghistory, Books, Payments, Marketers, Referrals, SalesReports, MarketerTransactions, AuthorTransactions, AuthorWallets
from sqlalchemy import func

home_bp = Blueprint('home', __name__)


@home_bp.route('/', methods=['GET'])
def index():
    return jsonify({
        'success': True,
        'message': 'DADS Bookshelves API',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    })


@home_bp.route('/about', methods=['GET'])
def about():
    return jsonify({
        'success': True,
        'about': 'DADS Bookshelves - Digital Book Distribution System'
    })


@home_bp.route('/dashboardstats', methods=['GET'])
@jwt_required(optional=True)
def dashboardstats():
    try:
        user_id = get_jwt_identity()
        if user_id:
            user_id = int(user_id)
        
        user_role = 'user'
        
        if user_id:
            user = Users.query.get(user_id)
            if user and user.user_role_id:
                role = Roles.query.get(user.user_role_id)
                user_role = role.role_code if role else 'user'
        
        is_super_admin = user_role == 'super_admin'
        is_admin = user_role == 'admin'
        is_marketer = user_role == 'marketer'
        is_client = user_role == 'client'
        is_author = user_role == 'author'
        
        base_stats = {}
        
        # Regular user stats (including client, user roles)
        if user_id and not is_super_admin and not is_admin and not is_marketer:
            try:
                total_orders = Orders.query.filter_by(user_id=user_id).count()
                library_access = Membership.query.filter_by(user_id=user_id, membership_status='active').count()
                ebook_conversions = EbookUploader.query.filter_by(user_id=user_id).count()
                books_purchased = BookPurchases.query.filter_by(user_id=user_id).count()
                payments = Payments.query.filter_by(user_id=user_id).count()
                
                membership = Membership.query.filter_by(user_id=user_id, membership_status='active').first()
                
                recent_ebooks = EbookUploader.query.filter_by(user_id=user_id).order_by(EbookUploader.date_uploaded.desc()).limit(5).all()
                recent_orders = Orders.query.filter_by(user_id=user_id).order_by(Orders.order_date.desc()).limit(5).all()
                
                base_stats['totalOrders'] = total_orders
                base_stats['hasLibraryAccess'] = library_access > 0
                base_stats['ebookConversions'] = ebook_conversions
                base_stats['booksPurchased'] = books_purchased
                base_stats['payments'] = payments
                
                if membership:
                    base_stats['membership'] = {
                        'planName': membership.subscription_type or 'Unknown',
                        'startDate': membership.join_date.isoformat() if membership.join_date else None,
                        'expiryDate': membership.subscription_expiry.isoformat() if membership.subscription_expiry else None,
                        'status': membership.membership_status
                    }
                
                base_stats['recentEbooks'] = [{
                    'id': e.id,
                    'book_title': e.book_title,
                    'status': e.status,
                    'date_uploaded': e.date_uploaded if isinstance(e.date_uploaded, str) else (e.date_uploaded.isoformat() if e.date_uploaded else None),
                    'payment_status': e.payment_status
                } for e in recent_ebooks]
                
                base_stats['recentOrders'] = [{
                    'order_id': o.order_id,
                    'total_amount': float(o.total_amount) if o.total_amount else 0,
                    'status': o.status,
                    'order_date': o.order_date if isinstance(o.order_date, str) else (o.order_date.isoformat() if o.order_date else None)
                } for o in recent_orders]
            except Exception as e:
                import traceback
                print(f'USER STATS ERROR: {type(e).__name__}: {e}')
                print(traceback.format_exc())
        
        # Author stats
        if is_author and user_id:
            user = Users.query.get(user_id)
            author_name = user.name if user else ''
            
            published_books = Books.query.filter_by(author=author_name).all()
            
            total_earnings = db.session.query(func.sum(AuthorTransactions.amount)).filter(
                AuthorTransactions.user_id == user_id,
                AuthorTransactions.status == 'completed'
            ).scalar() or 0
            
            pending_earnings = db.session.query(func.sum(AuthorTransactions.amount)).filter(
                AuthorTransactions.user_id == user_id,
                AuthorTransactions.status == 'pending'
            ).scalar() or 0
            
            wallet = AuthorWallets.query.filter_by(user_id=user_id).first()
            
            base_stats['publishedBooks'] = len(published_books)
            base_stats['totalBooksSold'] = sum(b.purchase_count or 0 for b in published_books)
            base_stats['totalEarnings'] = float(total_earnings)
            base_stats['pendingEarnings'] = float(pending_earnings)
            base_stats['walletBalance'] = float(wallet.balance) if wallet and wallet.balance else 0
            base_stats['recentBooks'] = [{
                'book_id': b.book_id,
                'title': b.title,
                'author': b.author,
                'price': float(b.price) if b.price else 0,
                'purchase_count': b.purchase_count or 0
            } for b in published_books[:5]]
        
        # Admin & Super Admin stats
        if is_super_admin or is_admin:
            now = datetime.utcnow()
            month_start = datetime(now.year, now.month, 1)
            
            total_users = Users.query.count()
            total_books = Books.query.count()
            
            total_revenue = db.session.query(func.sum(Payments.amount)).filter(
                Payments.status == 'completed'
            ).scalar() or 0
            
            monthly_revenue = db.session.query(func.sum(Payments.amount)).filter(
                Payments.status == 'completed',
                Payments.payment_date >= month_start
            ).scalar() or 0
            
            total_orders = Orders.query.count()
            pending_orders = Orders.query.filter_by(status='pending').count()
            completed_orders = Orders.query.filter_by(status='delivered').count()
            
            base_stats['totalUsers'] = total_users
            base_stats['totalBooks'] = total_books
            base_stats['totalRevenue'] = float(total_revenue)
            base_stats['monthlyRevenue'] = float(monthly_revenue)
            base_stats['totalOrders'] = total_orders
            base_stats['pendingOrders'] = pending_orders
            base_stats['completedOrders'] = completed_orders
            base_stats['marketersCount'] = Marketers.query.count()
        
        # Marketer stats
        if is_marketer and user_id:
            marketer = Marketers.query.filter_by(user_id=user_id).first()
            
            if marketer:
                total_earnings = db.session.query(func.sum(MarketerTransactions.amount)).filter(
                    MarketerTransactions.marketer_id == marketer.marketer_id,
                    MarketerTransactions.status == 'completed'
                ).scalar() or 0
                
                pending_earnings = db.session.query(func.sum(MarketerTransactions.amount)).filter(
                    MarketerTransactions.marketer_id == marketer.marketer_id,
                    MarketerTransactions.status == 'pending'
                ).scalar() or 0
                
                total_referrals = Referrals.query.filter_by(referrer_id=user_id).count()
                
                # My Sales - count of referrals with completed purchases
                my_sales = Referrals.query.filter_by(referrer_id=user_id).filter(
                    Referrals.first_purchase_id.isnot(None),
                    Referrals.status == 'completed'
                ).count()
                
                base_stats['totalEarnings'] = float(total_earnings)
                base_stats['pendingEarnings'] = float(pending_earnings)
                base_stats['totalReferrals'] = total_referrals
                base_stats['mySales'] = my_sales
        
        return jsonify({'success': True, 'data': base_stats})
    except Exception as e:
        import traceback
        print(f'DASHBOARDSTATS CRASH: {type(e).__name__}: {e}')
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500