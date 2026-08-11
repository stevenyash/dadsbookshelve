from src.models import db
from datetime import datetime

class FinanceTransaction(db.Model):
    __tablename__ = 'finance_transactions'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    type = db.Column(db.String(50), nullable=False)  # payment, refund, commission, payout, withdrawal
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    currency = db.Column(db.String(3), default='KES')
    description = db.Column(db.Text)
    reference_id = db.Column(db.String(100))  # order_id, payment_id, etc.
    status = db.Column(db.String(20), default='pending')  # pending, completed, failed, cancelled
    transaction_metadata = db.Column(db.JSON)  # Renamed from 'metadata' (reserved)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('Users', backref='finance_transactions', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'user_id': self.user_id,
            'amount': float(self.amount) if self.amount else None,
            'currency': self.currency,
            'description': self.description,
            'reference_id': self.reference_id,
            'status': self.status,
            'metadata': self.transaction_metadata,  # Keep API field as 'metadata'
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
