from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth import require_auth, require_admin
from src.models import db, FinanceTransaction, Payments, OrderItems, Books, Users, Marketers, Commission, PayoutRequest
from datetime import datetime, timedelta
from sqlalchemy import func, extract

finance_admin_bp = Blueprint('finance_admin', __name__)


@finance_admin_bp.route('/finance/summary', methods=['GET'])
@require_auth
@require_admin
def summary():
    """Financial overview dashboard"""
    try:
        # Date range filters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = FinanceTransaction.query
        
        if start_date:
            query = query.filter(FinanceTransaction.created_at >= start_date)
        if end_date:
            query = query.filter(FinanceTransaction.created_at <= end_date)
        
        # Calculate totals
        total_income = db.session.query(
            func.sum(FinanceTransaction.amount)
        ).filter(
            query.filter(FinanceTransaction.type.in_(['payment', 'commission']), FinanceTransaction.status == 'completed')
        ).scalar() or 0
        
        total_expenses = db.session.query(
            func.sum(FinanceTransaction.amount)
        ).filter(
            query.filter(FinanceTransaction.type.in_(['payout', 'withdrawal', 'refund']), FinanceTransaction.status == 'completed')
        ).scalar() or 0
        
        pending_payouts = db.session.query(
            func.sum(FinanceTransaction.amount)
        ).filter(
            query.filter(FinanceTransaction.type == 'payout', FinanceTransaction.status == 'pending')
        ).scalar() or 0
        
        total_transactions = query.count()
        
        return jsonify({
            'success': True,
            'data': {
                'total_income': float(total_income),
                'total_expenses': float(total_expenses),
                'net_profit': float(total_income - total_expenses),
                'pending_payouts': float(pending_payouts),
                'total_transactions': total_transactions
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@finance_admin_bp.route('/finance/transactions', methods=['GET'])
@require_auth
@require_admin
def transactions():
    """List all financial transactions"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 50, type=int)
        type_filter = request.args.get('type')
        status_filter = request.args.get('status')
        user_id = request.args.get('user_id', type=int)
        
        query = FinanceTransaction.query
        
        if type_filter:
            query = query.filter_by(type=type_filter)
        if status_filter:
            query = query.filter_by(status=status_filter)
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        total = query.count()
        transactions = query.order_by(FinanceTransaction.created_at.desc()) \
                           .offset((page - 1) * limit) \
                           .limit(limit) \
                           .all()
        
        return jsonify({
            'success': True,
            'records': [t.to_dict() for t in transactions],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@finance_admin_bp.route('/finance/reports/monthly', methods=['GET'])
@require_auth
@require_admin
def monthly_report():
    """Monthly income/expense report"""
    try:
        year = request.args.get('year', datetime.utcnow().year, type=int)
        
        # Group by month
        monthly_data = db.session.query(
            extract('month', FinanceTransaction.created_at).label('month'),
            func.sum(db.case((FinanceTransaction.type.in_(['payment', 'commission']), FinanceTransaction.amount), else_=0)).label('income'),
            func.sum(db.case((FinanceTransaction.type.in_(['payout', 'withdrawal', 'refund']), FinanceTransaction.amount), else_=0)).label('expenses')
        ).filter(
            extract('year', FinanceTransaction.created_at) == year,
            FinanceTransaction.status == 'completed'
        ).group_by(extract('month', FinanceTransaction.created_at)).all()
        
        result = []
        for row in monthly_data:
            result.append({
                'month': int(row.month),
                'income': float(row.income or 0),
                'expenses': float(row.expenses or 0),
                'net': float((row.income or 0) - (row.expenses or 0))
            })
        
        return jsonify({'success': True, 'records': result, 'year': year})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@finance_admin_bp.route('/finance/commissions', methods=['GET'])
@require_auth
@require_admin
def commissions():
    """Commission summary (payments to marketers/authors)"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 50, type=int)
        marketer_id = request.args.get('marketer_id', type=int)
        status = request.args.get('status')  # pending, paid, processed
        
        query = Commission.query
        
        if marketer_id:
            query = query.filter_by(marketer_id=marketer_id)
        if status:
            query = query.filter_by(status=status)
        
        total = query.count()
        commissions = query.order_by(Commission.created_at.desc()) \
                          .offset((page - 1) * limit) \
                          .limit(limit) \
                          .all()
        
        total_commissions = db.session.query(func.sum(Commission.amount)).filter(query).scalar() or 0
        
        return jsonify({
            'success': True,
            'records': [{
                'id': c.id,
                'marketer_id': c.marketer_id,
                'marketer_name': c.marketer.user.name if c.marketer and c.marketer.user else None,
                'amount': float(c.amount),
                'source': c.source,
                'reference_id': c.reference_id,
                'status': c.status,
                'created_at': c.created_at.isoformat() if c.created_at else None,
                'processed_at': c.processed_at.isoformat() if c.processed_at else None,
            } for c in commissions],
            'summary': {
                'total_commissions': float(total_commissions),
                'count': total
            },
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@finance_admin_bp.route('/finance/payouts', methods=['GET'])
@require_auth
@require_admin
def payouts():
    """Payout requests summary"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 50, type=int)
        status = request.args.get('status')  # pending, paid, rejected
        
        query = PayoutRequest.query
        
        if status:
            query = query.filter_by(status=status)
        
        total = query.count()
        payouts = query.order_by(PayoutRequest.created_at.desc()) \
                       .offset((page - 1) * limit) \
                       .limit(limit) \
                       .all()
        
        total_payouts = db.session.query(func.sum(PayoutRequest.amount)).filter(query).scalar() or 0
        
        return jsonify({
            'success': True,
            'records': [{
                'id': p.id,
                'marketer_id': p.marketer_id,
                'marketer_name': p.marketer.user.name if p.marketer and p.marketer.user else None,
                'amount': float(p.amount),
                'method': p.method if hasattr(p, 'method') else 'mpesa',
                'phone': p.phone if hasattr(p, 'phone') else None,
                'status': p.status,
                'created_at': p.created_at.isoformat() if p.created_at else None,
                'processed_at': p.processed_at.isoformat() if p.processed_at else None,
            } for p in payouts],
            'summary': {
                'total_payouts': float(total_payouts),
                'count': total
            },
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
