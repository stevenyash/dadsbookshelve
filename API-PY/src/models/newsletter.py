from src.models import db
from datetime import datetime

class Newsletter(db.Model):
    __tablename__ = 'newsletter'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    html_content = db.Column(db.Text)
    status = db.Column(db.String(20), default='draft')  # draft, scheduled, sent, failed
    recipients_count = db.Column(db.Integer, default=0)
    sent_at = db.Column(db.DateTime)
    scheduled_at = db.Column(db.DateTime)
    created_by = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    creator = db.relationship('Users', backref='newsletters_created', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'subject': self.subject,
            'content': self.content,
            'html_content': self.html_content,
            'status': self.status,
            'recipients_count': self.recipients_count,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
