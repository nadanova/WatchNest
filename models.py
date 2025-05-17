# from flask_sqlalchemy import SQLAlchemy

# db = SQLAlchemy()

# # Association Table: many-to-many between Watchlist and Movie
# watchlist_movie = db.Table('watchlist_movie',
#     db.Column('watchlist_id', db.Integer, db.ForeignKey('watchlist.watchlist_id'), primary_key=True),
#     db.Column('movie_id', db.Integer, db.ForeignKey('movie.movie_id'), primary_key=True)
# )


# class User(db.Model):
#     __tablename__ = 'user'
#     user_id = db.Column(db.Integer, primary_key=True)
#     username = db.Column(db.String(80), unique=True, nullable=False)
#     password_hash = db.Column(db.String(128), nullable=False)

#     watchlists = db.relationship('Watchlist', back_populates='user', cascade='all, delete-orphan')

# class Watchlist(db.Model):
#     __tablename__ = 'watchlist'
#     watchlist_id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.String(100), nullable=False)
#     color = db.Column(db.String(20), default="#007bff")  # Store color as hex
#     user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
#     notes = db.Column(db.Text, nullable=True)

#     user = db.relationship('User', back_populates='watchlists')
#     movies = db.relationship('Movie', secondary=watchlist_movie, back_populates='watchlists')

# class Movie(db.Model):
#     __tablename__ = 'movie'
#     movie_id = db.Column(db.Integer, primary_key=True)
#     tmdb_id = db.Column(db.Integer, unique=True, nullable=False)
#     title = db.Column(db.String(200), nullable=False)
#     poster_url = db.Column(db.String(255))
#     release_date = db.Column(db.String(20))
#     rating = db.Column(db.Integer)

#     watchlists = db.relationship('Watchlist', secondary=watchlist_movie, back_populates='movies')


from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'user'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    watchlists = db.relationship('Watchlist', back_populates='user', cascade='all, delete-orphan')

class Watchlist(db.Model):
    __tablename__ = 'watchlist'
    watchlist_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    color = db.Column(db.String(20), default="#007bff")  # Store color as hex
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    notes = db.Column(db.Text, nullable=True)

    user = db.relationship('User', back_populates='watchlists')
    entries = db.relationship('WatchlistEntry', back_populates='watchlist', cascade='all, delete-orphan')

class Movie(db.Model):
    __tablename__ = 'movie'
    movie_id = db.Column(db.Integer, primary_key=True)
    tmdb_id = db.Column(db.Integer, unique=True, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    poster_url = db.Column(db.String(255))
    release_date = db.Column(db.String(20))
    rating = db.Column(db.Integer)

    entries = db.relationship('WatchlistEntry', back_populates='movie', cascade='all, delete-orphan')

class WatchlistEntry(db.Model):
    __tablename__ = 'watchlist_entry'
    entry_id = db.Column(db.Integer, primary_key=True)
    watchlist_id = db.Column(db.Integer, db.ForeignKey('watchlist.watchlist_id'), nullable=False)
    movie_id = db.Column(db.Integer, db.ForeignKey('movie.movie_id'), nullable=False)
    notes = db.Column(db.Text)
    rating = db.Column(db.Integer)
    watched = db.Column(db.Boolean, default=False, nullable=False)

    watchlist = db.relationship('Watchlist', back_populates='entries')
    movie = db.relationship('Movie', back_populates='entries')