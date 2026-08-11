import os

class Config:
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.public_dir = os.path.join(self.base_dir, 'assets')
        self.temp_dir = os.path.join(self.public_dir, 'uploads', 'temp')
        self.url = os.getenv('APP_URL', 'http://localhost:5000')
        
    def ensure_dirs(self):
        os.makedirs(self.temp_dir, exist_ok=True)
        for subdir in ['image_url', 'cover_page', 'books', 'ebook', 'converted', 'proofs', 'images_url', 'encrypted']:
            os.makedirs(os.path.join(self.public_dir, 'uploads', 'files', subdir), exist_ok=True)
        # Also create encrypted dir at uploads/encrypted level
        os.makedirs(os.path.join(self.public_dir, 'uploads', 'encrypted'), exist_ok=True)

app_config = Config()
app_config.ensure_dirs()

upload_config = {
    'image_url': {
        'filenameType': 'random',
        'extensions': 'jpg,jpeg,png,gif,webp',
        'limit': '1',
        'maxFileSize': '5',
        'returnFullpath': False,
        'filenamePrefix': '',
        'uploadDir': 'uploads/files/image_url',
        'imageResize': [
            {'name': 'small', 'width': 150, 'height': 150, 'mode': 'cover'},
            {'name': 'medium', 'width': 300, 'height': 300, 'mode': 'cover'},
            {'name': 'large', 'width': 600, 'height': 600, 'mode': 'cover'},
        ]
    },
    'cover_image': {
        'filenameType': 'random',
        'extensions': 'jpg,jpeg,png,gif,webp',
        'limit': '1',
        'maxFileSize': '5',
        'returnFullpath': False,
        'filenamePrefix': 'cover_',
        'uploadDir': 'uploads/files/cover_page',
    },
    'book': {
        'filenameType': 'random',
        'extensions': 'pdf,epub,mobi',
        'limit': '1',
        'maxFileSize': '50',
        'returnFullpath': False,
        'filenamePrefix': '',
        'uploadDir': 'uploads/files/books',
    },
    'ebook': {
        'filenameType': 'random',
        'extensions': 'epub,pdf',
        'limit': '1',
        'maxFileSize': '50',
        'returnFullpath': False,
        'filenamePrefix': '',
        'uploadDir': 'uploads/files/ebook',
    },
    'converted': {
        'filenameType': 'random',
        'extensions': 'epub,pdf',
        'limit': '1',
        'maxFileSize': '50',
        'returnFullpath': False,
        'filenamePrefix': '',
        'uploadDir': 'uploads/files/converted',
    },
    'proofs': {
        'filenameType': 'random',
        'extensions': 'pdf',
        'limit': '1',
        'maxFileSize': '20',
        'returnFullpath': False,
        'filenamePrefix': '',
        'uploadDir': 'uploads/files/proofs',
    },
    'images_url': {
        'filenameType': 'random',
        'extensions': 'jpg,jpeg,png,gif,webp',
        'limit': '10',
        'maxFileSize': '5',
        'returnFullpath': False,
        'filenamePrefix': '',
        'uploadDir': 'uploads/files/images_url',
    },
}