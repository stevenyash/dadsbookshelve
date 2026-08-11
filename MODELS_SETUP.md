# New Admin Module Models - SQLAlchemy

## Create separate model files in API-PY/src/models/

### 1. Carousel Model
**File:** `API-PY/src/models/carousel.py`
```python
from src.models import db
from datetime import datetime

class Carousel(db.Model):
    __tablename__ = 'carousel'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(500), nullable=False)
    link_url = db.Column(db.String(500))
    button_text = db.Column(db.String(100))
    order_index = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    created_by = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'image_url': self.image_url,
            'link_url': self.link_url,
            'button_text': self.button_text,
            'order_index': self.order_index,
            'is_active': self.is_active,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
```

### 2. Book of Day Model
**File:** `API-PY/src/models/book_of_day.py`
```python
from src.models import db
from datetime import datetime

class BookOfDay(db.Model):
    __tablename__ = 'book_of_day'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.book_id'), nullable=False)
    featured_date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    book = db.relationship('Books', backref='book_of_day_entries', lazy=True)
    
    __table_args__ = (
        db.UniqueConstraint('book_id', 'featured_date', name='unique_book_per_day'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'book_id': self.book_id,
            'featured_date': self.featured_date.isoformat() if self.featured_date else None,
            'reason': self.reason,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'book': {
                'book_id': self.book.book_id,
                'title': self.book.title,
                'author': self.book.author,
                'image_url': self.book.image_url,
            } if self.book else None
        }
```

### 3. Newsletter Model
**File:** `API-PY/src/models/newsletter.py`
```python
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
```

### 4. Finance Transaction Model
**File:** `API-PY/src/models/finance.py`
```python
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
    metadata = db.Column(db.JSON)  # Additional data
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
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
```

---

## Step 2: Register Models

Update `API-PY/src/models/__init__.py`:

```python
# Add imports at top
from src.models.carousel import Carousel
from src.models.book_of_day import BookOfDay
from src.models.newsletter import Newsletter
from src.models.finance import FinanceTransaction

# Add to __all__ list
__all__ = [
    # ... existing models ...
    'Carousel', 'BookOfDay', 'Newsletter', 'FinanceTransaction'
]
```

---

## Step 3: Create Migrations

```bash
cd D:\nzuki2025\dbsebook\API-PY
# If using Flask-Migrate/Alembic:
flask db migrate -m "Add carousel, book_of_day, newsletter, finance_transactions tables"
flask db upgrade

# If using raw SQL, create migration script in migrations/ folder
```

---

## Notes

1. **Carousel**: Simple image slider with ordering and date range
2. **Book of Day**: One book per day, unique constraint on (book_id, featured_date)
3. **Newsletter**: Separate from `NewsletterSubscriptions` (which is for user subscription management)
4. **FinanceTransaction**: Generic ledger for all financial movements, separate from `Payments` table
5. All models include `created_at`/`updated_at` timestamps
6. Use `db` from `src.models` (already initialized SQLAlchemy instance)
7. Relationships: `BookOfDay` → `Books`, `Newsletter` → `Users` (creator), `FinanceTransaction` → `Users`

Files to create:
- `API-PY/src/models/carousel.py`
- `API-PY/src/models/book_of_day.py`
- `API-PY/src/models/newsletter.py`
- `API-PY/src/models/finance.py`
- Update `API-PY/src/models/__init__.py`
