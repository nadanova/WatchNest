from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from models import db, User, Movie, Watchlist, WatchlistEntry  
import requests
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "replace_this_with_a_random_secret_key"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///movie_app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

TMDB_API_KEY = 'efb7fd445123bbd75aedd2d569aa8142'
TMDB_BASE_URL = 'https://api.themoviedb.org/3'
TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'


# --- Routes ---
@app.route("/")
def welcome():
    return render_template("welcome.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        confirm_password = request.form["confirm_password"]
        if User.query.filter_by(username=username).first():
            flash("Username already exists.", "error")
            return render_template("register.html")
        if password != confirm_password:
            flash("Passwords do not match.", "error")
            return render_template("register.html")
        user = User(username=username, password_hash=generate_password_hash(password))
        db.session.add(user)
        db.session.commit()
        flash("Account created! Please log in.", "success")
        return redirect(url_for("login"))
    return render_template("register.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash, password):
            session["user_id"] = user.user_id
            session["username"] = user.username
            return redirect(url_for("home"))
        else:
            flash("Invalid username or password.", "error")
            return render_template("login.html")
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("welcome"))

@app.route("/home")
def home():
    if "user_id" not in session:
        return redirect(url_for("login"))
    return render_template("home.html", username=session["username"])


@app.route("/search", methods=["GET"])
def search():
    if "user_id" not in session:
        return redirect(url_for("login"))
    query = request.args.get("query", "")
    url = f"{TMDB_BASE_URL}/search/movie"
    response = requests.get(url, params={"api_key": TMDB_API_KEY, "query": query})
    movies = []
    if response.status_code == 200:
        data = response.json()
        for item in data.get("results", []):
            tmdb_id = item["id"]
            title = item.get("title", "")
            poster_path = item.get("poster_path")
            poster_url = f"{TMDB_IMAGE_BASE_URL}{poster_path}" if poster_path else None
            release_date = item.get("release_date", "")
            vote_average = item.get("vote_average", 0)  # Get the vote average from TMDB
            
            # Save to DB if not already present
            movie = Movie.query.filter_by(tmdb_id=tmdb_id).first()
            if not movie:
                movie = Movie(tmdb_id=tmdb_id, title=title, poster_url=poster_url, 
                             release_date=release_date, rating=vote_average)
                db.session.add(movie)
                db.session.commit()
            elif movie.rating is None or movie.rating == 0:
                # Update rating if it's missing in our database
                movie.rating = vote_average
                db.session.commit()
                
            movies.append({
                "movie_id": movie.movie_id,
                "tmdb_id": movie.tmdb_id,
                "title": movie.title,
                "poster_url": movie.poster_url,
                "release_date": movie.release_date,
                "rating": vote_average  # Include rating in the response
            })
    return jsonify(movies)


@app.route("/watchlist", methods=["GET", "POST", "DELETE"])
def watchlist():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    user_id = session["user_id"]
    
    if request.method == "POST":
        movie_id = request.json.get("movie_id")
        rating = request.json.get("rating")
        notes = request.json.get("notes")
        watched = request.json.get("watched", False)
        # Avoid duplicate entries
        existing = Watchlist.query.filter_by(user_id=user_id, movie_id=movie_id).first()
        if existing:
            return jsonify({"message": "Movie already in watchlist"}), 400
        entry = Watchlist(user_id=user_id, movie_id=movie_id, rating=rating, notes=notes, watched=watched)
        db.session.add(entry)
        db.session.commit()
        return jsonify({"message": "Movie added to watchlist"})
    
    elif request.method == "DELETE":
        movie_id = request.json.get("movie_id")
        entry = Watchlist.query.filter_by(user_id=user_id, movie_id=movie_id).first()
        if entry:
            db.session.delete(entry)
            db.session.commit()
            return jsonify({"message": "Movie removed from watchlist"})
        else:
            return jsonify({"error": "Entry not found"})
    
    else:
        # GET: list watchlist
        entries = Watchlist.query.filter_by(user_id=user_id).all()
        watchlist = []
        for entry in entries:
            movie = Movie.query.get(entry.movie_id)
            if movie:  # Make sure the movie exists
                watchlist.append({
                    "entry_id": entry.entry_id,
                    "movie_id": movie.movie_id,
                    "title": movie.title,
                    "poster_url": movie.poster_url,
                    "release_date": movie.release_date,
                    "rating": entry.rating,
                    "notes": entry.notes,
                    "watched": entry.watched
                })
        return jsonify(watchlist)

@app.route("/watchlist/<int:entry_id>", methods=["PUT"])
def update_watchlist_entry(entry_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    entry = Watchlist.query.get(entry_id)
    if not entry or entry.user_id != session["user_id"]:
        return jsonify({"error": "Entry not found"}), 404
    data = request.json
    entry.rating = data.get("rating", entry.rating)
    entry.notes = data.get("notes", entry.notes)
    entry.watched = data.get("watched", entry.watched)
    db.session.commit()
    return jsonify({"message": "Watchlist entry updated"})


@app.route("/watchlists", methods=["GET", "POST"])
def manage_watchlists():
    """Get all watchlists or create a new one"""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    
    user_id = session["user_id"]
    
    if request.method == "POST":
        # Handle JSON or form data
        if request.is_json:
            data = request.json
            name = data.get("name")
            color = data.get("color", "#007bff")  # Default blue color
            notes = data.get("notes", "")  # Get notes with empty default
        else:
            name = request.form.get("name")
            color = request.form.get("color", "#007bff")
            notes = request.form.get("notes", "")
            
        if not name:
            return jsonify({"status": "error", "message": "Watchlist name is required"}), 400
            
        # Check if watchlist with this name already exists for this user
        if Watchlist.query.filter_by(user_id=user_id, name=name).first():
            return jsonify({"status": "error", "message": "You already have a watchlist with that name"}), 400
            
        # Create the watchlist with notes
        watchlist = Watchlist(name=name, color=color, user_id=user_id, notes=notes)
        db.session.add(watchlist)
        db.session.commit()
        
        return jsonify({
            "status": "success", 
            "message": f"Watchlist '{name}' created!",
            "watchlist_id": watchlist.watchlist_id,
            "name": watchlist.name,
            "color": watchlist.color,
            "notes": watchlist.notes
        })
    
    # GET method - return all watchlists for this user
    watchlists = Watchlist.query.filter_by(user_id=user_id).all()
    return jsonify([{
        "watchlist_id": w.watchlist_id,
        "name": w.name,
        "color": w.color,
        "notes": w.notes
    } for w in watchlists])

@app.route("/watchlists/<int:watchlist_id>/notes", methods=["PUT"])
def update_watchlist_notes(watchlist_id):
    """Update notes for a specific watchlist"""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
        
    user_id = session["user_id"]
    watchlist = Watchlist.query.filter_by(watchlist_id=watchlist_id, user_id=user_id).first()
    
    if not watchlist:
        return jsonify({"status": "error", "message": "Watchlist not found or access denied"}), 404
    
    data = request.json
    notes = data.get("notes", "")
    
    # Update the notes
    watchlist.notes = notes
    db.session.commit()
    
    return jsonify({
        "status": "success",
        "message": "Notes updated successfully",
        "notes": watchlist.notes
    })


# @app.route("/watchlists/<int:watchlist_id>/movies", methods=["POST", "DELETE"])
# def manage_watchlist_movies(watchlist_id):
#     """Add or remove movies from a specific watchlist"""
#     if "user_id" not in session:
#         return jsonify({"error": "Not logged in"}), 401
        
#     user_id = session["user_id"]
#     watchlist = Watchlist.query.filter_by(watchlist_id=watchlist_id, user_id=user_id).first()
    
#     if not watchlist:
#         return jsonify({"error": "Watchlist not found or access denied"}), 404
    
#     if request.method == "POST":
#         movie_id = request.json.get("movie_id")
#         movie = Movie.query.get(movie_id)
        
#         if not movie:
#             return jsonify({"error": "Movie not found"}), 404
            
#         if movie in watchlist.movies:
#             return jsonify({"message": "Movie already in this watchlist"}), 400
            
#         watchlist.movies.append(movie)
#         db.session.commit()
#         return jsonify({"message": f"Movie added to {watchlist.name}"})
    
#     elif request.method == "DELETE":
#         movie_id = request.json.get("movie_id") 
#         movie = Movie.query.get(movie_id)
        
#         if not movie:
#             return jsonify({"error": "Movie not found"}), 404
            
#         if movie not in watchlist.movies:
#             return jsonify({"error": "Movie not in this watchlist"}), 404
            
#         watchlist.movies.remove(movie)
#         db.session.commit()
#         return jsonify({"message": f"Movie removed from {watchlist.name}"})

@app.route("/create-watchlist-popup", methods=["POST"])
def create_watchlist_popup():
    """Create a new watchlist from the popup form"""
    if "user_id" not in session:
        flash("Not logged in.", "error")
        return redirect(url_for("home", show_modal="1"))
    
    user_id = session["user_id"]
    name = request.form.get("watchlist_name")
    color = request.form.get("watchlist_color")
    
    if not name or not color:
        flash("Both name and color are required.", "error")
        return redirect(url_for("home", show_modal="1"))
        
    # Check for duplicate watchlist name
    existing = Watchlist.query.filter_by(user_id=user_id, name=name).first()
    if existing:
        flash("You already have a watchlist with that name.", "error")
        return redirect(url_for("home", show_modal="1"))
        
    # Create the watchlist
    new_watchlist = Watchlist(name=name, user_id=user_id)
    db.session.add(new_watchlist)
    db.session.commit()
    
    flash(f"Watchlist '{name}' created successfully!", "success")
    return redirect(url_for("home"))

#####################################################################
@app.route("/watchlists/batch-delete", methods=["DELETE"])
def batch_delete_watchlists():
    """Delete multiple watchlists at once"""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    
    user_id = session["user_id"]
    data = request.json
    watchlist_ids = data.get("watchlist_ids", [])
    
    if not watchlist_ids:
        return jsonify({
            "status": "error",
            "message": "No watchlists selected for deletion."
        })
    
    try:
        # Verify all watchlists belong to the current user
        watchlists = Watchlist.query.filter(
            Watchlist.watchlist_id.in_(watchlist_ids),
            Watchlist.user_id == user_id
        ).all()
        
        if len(watchlists) != len(watchlist_ids):
            return jsonify({
                "status": "error",
                "message": "One or more watchlists could not be found or don't belong to you."
            }), 403
        
        # Delete the watchlists
        for watchlist in watchlists:
            db.session.delete(watchlist)
        
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": f"Successfully deleted {len(watchlists)} watchlist(s).",
            "deleted_count": len(watchlists)
        })
    
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting watchlists: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred while deleting watchlists."
        }), 500
    


# @app.route("/watchlist/<int:watchlist_id>")
# def watchlist_detail(watchlist_id):
#     if "user_id" not in session:
#         return redirect(url_for("login"))
    
#     # Get the current watchlist
#     watchlist = Watchlist.query.get_or_404(watchlist_id)
    
#     # Ensure user owns this watchlist
#     if watchlist.user_id != session["user_id"]:
#         flash("You don't have access to that watchlist", "error")
#         return redirect(url_for("index"))
    
#     # Get all user's watchlists for the navigation bar
#     all_watchlists = Watchlist.query.filter_by(user_id=session["user_id"]).all()
    
#     # Get movies in this watchlist
#     movies = watchlist.movies
    
#     return render_template("watchlist_detail.html", 
#                           watchlist=watchlist, 
#                           all_watchlists=all_watchlists,
#                           movies=movies)

@app.route("/watchlists/<int:watchlist_id>/movies", methods=["POST", "DELETE"])
def manage_watchlist_movies(watchlist_id):
    """Add or remove movies from a specific watchlist"""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    user_id = session["user_id"]
    watchlist = Watchlist.query.filter_by(watchlist_id=watchlist_id, user_id=user_id).first()

    if not watchlist:
        return jsonify({"error": "Watchlist not found or access denied"}), 404

    if request.method == "POST":
        movie_id = request.json.get("movie_id")
        movie = Movie.query.get(movie_id)
        if not movie:
            return jsonify({"error": "Movie not found"}), 404
        # Check if already exists
        existing_entry = WatchlistEntry.query.filter_by(watchlist_id=watchlist_id, movie_id=movie_id).first()
        if existing_entry:
            return jsonify({"message": "Movie already in this watchlist"}), 400
        entry = WatchlistEntry(watchlist_id=watchlist_id, movie_id=movie_id, watched=False)
        db.session.add(entry)
        db.session.commit()
        return jsonify({"message": f"Movie added to {watchlist.name}"})

    elif request.method == "DELETE":
        movie_id = request.json.get("movie_id")
        entry = WatchlistEntry.query.filter_by(watchlist_id=watchlist_id, movie_id=movie_id).first()
        if not entry:
            return jsonify({"error": "Movie not in this watchlist"}), 404
        db.session.delete(entry)
        db.session.commit()
        return jsonify({"message": f"Movie removed from {watchlist.name}"})


@app.route("/watchlist/<int:watchlist_id>")
def watchlist_detail(watchlist_id):
    if "user_id" not in session:
        return redirect(url_for("login"))
    watchlist = Watchlist.query.get_or_404(watchlist_id)
    if watchlist.user_id != session["user_id"]:
        flash("You don't have access to that watchlist", "error")
        return redirect(url_for("index"))
    all_watchlists = Watchlist.query.filter_by(user_id=session["user_id"]).all()
    entries = WatchlistEntry.query.filter_by(watchlist_id=watchlist_id).all()
    # Pass entry and movie together
    movies = []
    for entry in entries:
        movie = entry.movie
        movies.append({
            "entry_id": entry.entry_id,
            "movie_id": movie.movie_id,
            "title": movie.title,
            "poster_url": movie.poster_url,
            "release_date": movie.release_date,
            "rating": entry.rating if entry.rating is not None else movie.rating,
            "notes": entry.notes,
            "watched": entry.watched
        })
    return render_template("watchlist_detail.html",
                          watchlist=watchlist,
                          all_watchlists=all_watchlists,
                          movies=movies)

@app.route("/watchlist-entry/<int:entry_id>/watched", methods=["PUT"])
def toggle_watched(entry_id):
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
    entry = WatchlistEntry.query.get_or_404(entry_id)
    watchlist = Watchlist.query.get(entry.watchlist_id)
    if watchlist.user_id != session["user_id"]:
        return jsonify({"error": "Permission denied"}), 403
    data = request.json
    watched = data.get("watched", None)
    if watched is None:
        return jsonify({"error": "Missing watched field"}), 400
    entry.watched = watched
    db.session.commit()
    return jsonify({"success": True, "watched": entry.watched})

####################-------######################
# @app.route("/watchlists/<int:watchlist_id>/movies/batch-delete", methods=["DELETE"])
# def batch_delete_movies(watchlist_id):
#     """Delete multiple movies from a watchlist at once"""
#     if "user_id" not in session:
#         return jsonify({"error": "Not logged in"}), 401
        
#     user_id = session["user_id"]
#     watchlist = Watchlist.query.filter_by(watchlist_id=watchlist_id, user_id=user_id).first()
    
#     if not watchlist:
#         return jsonify({"error": "Watchlist not found or access denied"}), 404
    
#     data = request.json
#     movie_ids = data.get("movie_ids", [])
    
#     if not movie_ids:
#         return jsonify({
#             "status": "error",
#             "message": "No movies selected for deletion."
#         })
    
#     try:
#         removed_count = 0
#         for movie_id in movie_ids:
#             movie = Movie.query.get(movie_id)
#             if movie and movie in watchlist.movies:
#                 watchlist.movies.remove(movie)
#                 removed_count += 1
        
#         db.session.commit()
        
#         return jsonify({
#             "status": "success",
#             "message": f"Successfully removed {removed_count} movie(s) from the watchlist.",
#             "deleted_count": removed_count
#         })
    
#     except Exception as e:
#         db.session.rollback()
#         app.logger.error(f"Error removing movies: {str(e)}")
#         return jsonify({
#             "status": "error",
#             "message": "An error occurred while removing movies."
#         }), 500

@app.route("/watchlists/<int:watchlist_id>/movies/batch-delete", methods=["DELETE"])
def batch_delete_movies(watchlist_id):
    """Delete multiple movies from a watchlist at once"""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401
        
    user_id = session["user_id"]
    watchlist = Watchlist.query.filter_by(watchlist_id=watchlist_id, user_id=user_id).first()
    
    if not watchlist:
        return jsonify({"error": "Watchlist not found or access denied"}), 404
    
    data = request.json
    movie_ids = data.get("movie_ids", [])
    
    if not movie_ids:
        return jsonify({
            "status": "error",
            "message": "No movies selected for deletion."
        })
    
    try:
        removed_count = 0
        for movie_id in movie_ids:
            entry = WatchlistEntry.query.filter_by(watchlist_id=watchlist_id, movie_id=movie_id).first()
            if entry:
                db.session.delete(entry)
                removed_count += 1
        
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": f"Successfully removed {removed_count} movie(s) from the watchlist.",
            "deleted_count": removed_count
        })
    
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error removing movies: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred while removing movies."
        }), 500


##############################################################################


# Add this to your app.py
def is_light_color(hex_color):
    """Determine if a color is light or dark"""
    if not hex_color or not hex_color.startswith('#'):
        return True
    
    # Convert hex to RGB
    r = int(hex_color[1:3], 16)
    g = int(hex_color[3:5], 16)
    b = int(hex_color[5:7], 16)
    
    # Calculate perceived brightness
    brightness = (r * 299 + g * 587 + b * 114) / 1000
    
    return brightness > 128

# Make it available to templates
app.jinja_env.globals.update(is_light_color=is_light_color)

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, host="0.0.0.0", port=5000)