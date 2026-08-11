from flask import Blueprint, request, jsonify
from src.models import db, Genres

genres_bp = Blueprint('genres', __name__)


@genres_bp.route('', methods=['GET'])
@genres_bp.route('/', methods=['GET'])
@genres_bp.route('/index', methods=['GET'])
def index():
    genres = Genres.query.all()
    return jsonify({
        'success': True,
        'records': [{'genre_id': g.genre_id, 'genre_name': g.genre_name, 'description': g.description} for g in genres]
    })


@genres_bp.route('/view/<int:genre_id>', methods=['GET'])
def view(genre_id):
    genre = Genres.query.get(genre_id)
    if not genre:
        return jsonify({'success': False, 'error': 'Genre not found'}), 404
    
    return jsonify({
        'success': True,
        'record': {'genre_id': genre.genre_id, 'genre_name': genre.genre_name, 'description': genre.description}
    })


@genres_bp.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    genre = Genres(genre_name=data.get('genre_name'), description=data.get('description'))
    db.session.add(genre)
    db.session.commit()
    return jsonify({'success': True, 'record': {'genre_id': genre.genre_id}})


@genres_bp.route('/edit/<int:genre_id>', methods=['PUT'])
def edit(genre_id):
    genre = Genres.query.get(genre_id)
    if not genre:
        return jsonify({'success': False, 'error': 'Genre not found'}), 404
    
    data = request.get_json()
    if 'genre_name' in data:
        genre.genre_name = data['genre_name']
    if 'description' in data:
        genre.description = data['description']
    db.session.commit()
    return jsonify({'success': True})


@genres_bp.route('/delete/<int:genre_id>', methods=['DELETE'])
def delete(genre_id):
    genre = Genres.query.get(genre_id)
    if not genre:
        return jsonify({'success': False, 'error': 'Genre not found'}), 404
    db.session.delete(genre)
    db.session.commit()
    return jsonify({'success': True})
