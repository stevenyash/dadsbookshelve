from .auth import auth_bp
from .books import books_bp
from .users import users_bp
from .orders import orders_bp
from .payments import payments_bp
from .genres import genres_bp
from .home import home_bp

__all__ = [
    'auth_bp',
    'books_bp',
    'users_bp',
    'orders_bp',
    'payments_bp',
    'genres_bp',
    'home_bp',
]
