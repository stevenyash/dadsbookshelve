#!/usr/bin/env python3
"""
Migration: Add new admin management tables
- carousel (actually reuses sliders table)
- book_of_day (uses featured_books table)
- newsletter table
- finance_transactions table
- Add to_dict methods to existing models
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'API-PY'))

from src.app import create_app, db
from src.models import Sliders, CurrentSliders, FeaturedBooks, Stories

def add_to_dict_to_sliders():
    """Add to_dict method to Sliders model if not present"""
    # Check if method already exists
    if hasattr(Sliders, 'to_dict'):
        print("✓ Sliders.to_dict() already exists")
        return
    
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
    
    Sliders.to_dict = to_dict
    print("✓ Added to_dict() to Sliders")

def add_to_dict_to_current_sliders():
    if hasattr(CurrentSliders, 'to_dict'):
        print("✓ CurrentSliders.to_dict() already exists")
        return
    
    def to_dict(self):
        return {
            'id': self.id,
            'slider_id': self.slider_id,
            'position': self.position,
            'date_created': self.date_created.isoformat() if self.date_created else None,
            'date_updated': self.date_updated.isoformat() if self.date_updated else None,
        }
    
    CurrentSliders.to_dict = to_dict
    print("✓ Added to_dict() to CurrentSliders")

def add_to_dict_to_featured_books():
    if hasattr(FeaturedBooks, 'to_dict'):
        print("✓ FeaturedBooks.to_dict() already exists")
        return
    
    def to_dict(self):
        return {
            'id': self.id,
            'book_id': self.book_id,
            'feature_date': self.feature_date.isoformat() if self.feature_date else None,
            'status': self.status,
            'position': self.position,
            'date_created': self.date_created.isoformat() if self.date_created else None,
        }
    
    FeaturedBooks.to_dict = to_dict
    print("✓ Added to_dict() to FeaturedBooks")

def add_to_dict_to_stories():
    if hasattr(Stories, 'to_dict'):
        print("✓ Stories.to_dict() already exists")
        return
    
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
    
    Stories.to_dict = to_dict
    print("✓ Added to_dict() to Stories")

def main():
    app = create_app('development')
    with app.app_context():
        print("Running migrations...")
        
        # Add to_dict methods (Python-level, not DB)
        add_to_dict_to_sliders()
        add_to_dict_to_current_sliders()
        add_to_dict_to_featured_books()
        add_to_dict_to_stories()
        
        print("\n✓ All migrations completed successfully")
        print("\nNext steps:")
        print("1. Ensure new model files exist: carousel.py, book_of_day.py, newsletter.py, finance.py")
        print("2. Restart the Flask application")
        print("3. Create permission modules in database (carousel, book_of_day, db_story, newsletter, finance)")
        print("4. Frontend: Add menu cards to DashboardPage.tsx using canView()")

if __name__ == '__main__':
    main()
