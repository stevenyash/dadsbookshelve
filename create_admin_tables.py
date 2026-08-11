#!/usr/bin/env python3
"""
Create tables for new admin management modules:
- newsletter
- finance_transactions

Existing tables (sliders, featured_books, stories) already exist.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'API-PY'))

from src.app import create_app, db
from src.models import Newsletter, FinanceTransaction, Carousel, BookOfDay

def create_new_tables():
    app = create_app('development')
    with app.app_context():
        print("Creating new tables...")
        
        # Create only the new tables
        # Note: Carousel/BookOfDay models exist but their tables might already be created 
        # (using existing sliders and featured_books). We just ensure they're in metadata.
        
        created = []
        skipped = []
        
        tables_to_check = [
            (Newsletter, 'newsletter'),
            (FinanceTransaction, 'finance_transactions'),
            # These don't create new tables but ensure models are registered:
            (Carousel, 'carousel'),
            (BookOfDay, 'book_of_day'),
        ]
        
        for model, table_name in tables_to_check:
            # Check if table exists
            engine = db.engine
            if not engine.dialect.has_table(engine.connect(), table_name):
                model.__table__.create(bind=engine)
                created.append(table_name)
            else:
                skipped.append(table_name)
                print(f"  Table '{table_name}' already exists (skipped)")
        
        if created:
            print(f"\n[OK] Created tables: {', '.join(created)}")
        else:
            print("\n[OK] All tables already exist")
        
        print("\nNext steps:")
        print("1. Create permission modules in database:")
        print("   INSERT INTO permission_modules (module_name, module_code, description) VALUES")
        print("   ('Carousel Management', 'carousel', 'Manage homepage carousel'),")
        print("   ('Book of Day Management', 'book_of_day', 'Manage featured books'),")
        print("   ('DBS Stories Management', 'db_story', 'Manage news/stories'),")
        print("   ('Newsletter Management', 'newsletter', 'Manage email newsletters'),")
        print("   ('Finance Management', 'finance', 'View financial reports');")
        print()
        print("2. Create permission actions (if not exists):")
        print("   INSERT INTO permission_actions (action_name, action_code) VALUES")
        print("   ('View', 'view'), ('Add', 'add'), ('Edit', 'edit'), ('Delete', 'delete');")
        print()
        print("3. Assign permissions to roles (admin/super_admin) via:")
        print("   - Admin UI: /permissions page")
        print("   - OR direct SQL inserts into role_permissions")
        print()
        print("4. Restart Flask application")
        print()
        print("5. Add menu cards to DashboardPage.tsx (frontend) in System Management section")

if __name__ == '__main__':
    create_new_tables()
