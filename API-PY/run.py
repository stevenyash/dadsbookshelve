import os
from src.app import create_app, db

app = create_app()


@app.cli.command('init-db')
def init_db():
    """Initialize the database tables"""
    with app.app_context():
        db.create_all()
        print('Database tables created!')


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
