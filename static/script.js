// --- DARK MODE LOGIC WITH PERSISTENCE ---
function applyDarkModeFromStorage() {
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  applyDarkModeFromStorage();

  const toggleBtn = document.getElementById("toggle-theme");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      document.body.classList.toggle("dark-mode");
      if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("darkMode", "enabled");
      } else {
        localStorage.setItem("darkMode", "disabled");
      }
    });
  }

  // Modal logic for create watchlist (popup show/hide)
  const modal = document.getElementById("create-watchlist-modal");
  const openBtn = document.getElementById("create-watchlist-btn");
  const closeBtn = document.getElementById("close-create-watchlist-modal");
  const form = document.getElementById("create-watchlist-form");
  const popupMessage = document.getElementById("popup-message");

  // Open modal
  if (openBtn && modal) {
    openBtn.onclick = function () {
      modal.style.display = "block";
      if (popupMessage) popupMessage.innerHTML = "";
      if (form) form.reset();
      const nameField = document.getElementById("watchlist_name");
      if (nameField) nameField.focus();
    };
  }

  // Close modal
  if (closeBtn && modal) {
    closeBtn.onclick = function () {
      modal.style.display = "none";
    };
  }

  // Close modal if clicked outside content
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  // Handle watchlist form submission via AJAX
  if (form) {
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      
      const name = document.getElementById("watchlist_name").value;
      const color = document.getElementById("watchlist_color").value;
      
      if (!name || !color) {
        showModalMessage("Both name and color are required.", "error");
        return;
      }
      
      fetch("/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color })
      })
      .then(response => response.json())
      .then(data => {
        if (data.status === "success") {
          showModalMessage(data.message, "success");
          fetchWatchlists(); // Refresh watchlist display
          setTimeout(() => {
            modal.style.display = "none";
          }, 2000);
        } else {
          showModalMessage(data.message, "error");
        }
      })
      .catch(err => {
        console.error("Error creating watchlist:", err);
        showModalMessage("Failed to create watchlist. Please try again.", "error");
      });
    });
  }

  // Function to show messages in the modal
  function showModalMessage(message, type) {
    if (popupMessage) {
      popupMessage.innerHTML = `<div class="${type}">${message}</div>`;
      
      // Auto-hide success messages, but keep error messages
      if (type === "success") {
        setTimeout(() => {
          popupMessage.innerHTML = "";
        }, 3000);
      }
    }
  }

  // Set up close buttons for flash messages
  document.querySelectorAll(".close-flash").forEach(btn => {
    btn.addEventListener("click", function() {
      this.parentNode.style.display = "none";
    });
  });

  // Auto-hide flash messages after 5 seconds
  const flashMessages = document.querySelectorAll('.flash');
  if (flashMessages.length > 0) {
    setTimeout(() => {
      flashMessages.forEach(msg => {
        msg.style.transition = 'opacity 1s';
        msg.style.opacity = '0';
        setTimeout(() => msg.style.display = 'none', 1000);
      });
    }, 5000);
  }

  // Fetch and display watchlists
  fetchWatchlists();

  // Search
  const searchBtn = document.getElementById("search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", performSearch);
    
    // Also allow Enter key in search input
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
          event.preventDefault();
          performSearch();
        }
      });
    }
  }
  
  // Initialize the watchlist action buttons if they exist
  initWatchlistActions();



  // Watched checkbox handler
  document.querySelectorAll('.toggle-watched').forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      const entryId = this.dataset.entryId;
      const watched = this.checked;
      fetch(`/watchlist-entry/${entryId}/watched`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched })
      })
        .then(response => response.json())
        .then(data => {
          if (!data.success) {
            alert("Failed to update watched status!");
            this.checked = !watched; // revert on failure
          }
        })
        .catch(() => {
          alert("Failed to update watched status (network error)");
          this.checked = !watched;
        });
    });
  });
});
// });

//---------------------------------------------------//

// Variables to track selection mode state
let isInSelectionMode = false;
let currentAction = null;
let selectedWatchlists = [];

// Initialize watchlist action buttons
function initWatchlistActions() {
  const deleteBtn = document.getElementById("delete-watchlists-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => enterSelectionMode("delete"));
  }
}

// Enter selection mode with the specified action type
function enterSelectionMode(action) {
  isInSelectionMode = true;
  currentAction = action;
  selectedWatchlists = [];
  
  // Update UI to show we're in selection mode
  const watchlistHeader = document.querySelector(".side-header");
  const watchlistDiv = document.getElementById("watchlist");
  const actionButtons = document.getElementById("watchlist-actions");
  
  if (watchlistHeader) {
    // Add a label showing the current mode
    const actionLabel = document.createElement("span");
    actionLabel.id = "selection-mode-label";
    actionLabel.className = "selection-mode-label";
    actionLabel.innerText = action === "delete" ? "Select watchlists to delete" : "Select watchlists";
    watchlistHeader.appendChild(actionLabel);
  }
  
  // Hide the regular action buttons and show the selection mode buttons
  if (actionButtons) {
    // Hide regular action buttons
    Array.from(actionButtons.querySelectorAll("button:not(.selection-mode-btn)")).forEach(
      btn => btn.style.display = "none"
    );
    
    // Create and show selection mode buttons if they don't exist
    if (!document.getElementById("cancel-selection-btn")) {
      const cancelBtn = document.createElement("button");
      cancelBtn.id = "cancel-selection-btn";
      cancelBtn.className = "block-btn selection-mode-btn";
      cancelBtn.innerText = "Cancel";
      cancelBtn.style.backgroundColor = "#6c757d";
      cancelBtn.addEventListener("click", exitSelectionMode);
      actionButtons.appendChild(cancelBtn);
      
      const confirmBtn = document.createElement("button");
      confirmBtn.id = "confirm-selection-btn";
      confirmBtn.className = "block-btn selection-mode-btn";
      confirmBtn.innerText = action === "delete" ? "Delete Selected" : "Confirm Selection";
      confirmBtn.style.backgroundColor = action === "delete" ? "#dc3545" : "#28a745";
      confirmBtn.style.marginTop = "8px";
      confirmBtn.addEventListener("click", confirmSelection);
      actionButtons.appendChild(confirmBtn);
    } else {
      // Update button text based on the action
      const confirmBtn = document.getElementById("confirm-selection-btn");
      if (confirmBtn) {
        confirmBtn.innerText = action === "delete" ? "Delete Selected" : "Confirm Selection";
        confirmBtn.style.backgroundColor = action === "delete" ? "#dc3545" : "#28a745";
      }
      
      // Show the selection mode buttons
      document.querySelectorAll(".selection-mode-btn").forEach(btn => {
        btn.style.display = "block";
      });
    }
  }
  
  // Convert watchlist buttons to selectable items
  if (watchlistDiv) {
    const watchlistButtons = watchlistDiv.querySelectorAll(".watchlist-button");
    watchlistButtons.forEach(btn => {
      // Add class to mark it's in selection mode
      btn.classList.add("in-selection-mode");
      
      // Create checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "watchlist-checkbox";
      checkbox.dataset.watchlistId = btn.dataset.id;
      
      // Create a wrapper for the button that contains the checkbox
      const wrapper = document.createElement("div");
      wrapper.className = "watchlist-selection-item";
      
      // Move the button into the wrapper and add checkbox
      btn.parentNode.insertBefore(wrapper, btn);
      wrapper.appendChild(checkbox);
      wrapper.appendChild(btn);
      
      // Handle clicks on the wrapper to toggle checkbox
      wrapper.addEventListener("click", function(e) {
        // Make sure we're not handling actual button functionality
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle checkbox
        checkbox.checked = !checkbox.checked;
        
        // Update selected list
        const watchlistId = btn.dataset.id;
        if (checkbox.checked) {
          if (!selectedWatchlists.includes(watchlistId)) {
            selectedWatchlists.push(watchlistId);
          }
        } else {
          selectedWatchlists = selectedWatchlists.filter(id => id !== watchlistId);
        }
        
        // Update confirm button state
        const confirmBtn = document.getElementById("confirm-selection-btn");
        if (confirmBtn) {
          confirmBtn.disabled = selectedWatchlists.length === 0;
          confirmBtn.style.opacity = selectedWatchlists.length === 0 ? "0.5" : "1";
        }
      });
    });
  }
  
  // Disable the confirm button initially since nothing is selected
  const confirmBtn = document.getElementById("confirm-selection-btn");
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = "0.5";
  }
}


// Exit selection mode without performing any action
function exitSelectionMode() {
  if (!isInSelectionMode) return;
  
  isInSelectionMode = false;
  currentAction = null;
  selectedWatchlists = [];
  
  // Clean up the UI
  const modeLabel = document.getElementById("selection-mode-label");
  if (modeLabel) modeLabel.remove();
  
  // Restore watchlist buttons
  const selectionItems = document.querySelectorAll(".watchlist-selection-item");
  selectionItems.forEach(wrapper => {
    const button = wrapper.querySelector(".watchlist-button");
    const parent = wrapper.parentNode;
    
    if (button) {
      // Remove selection mode class
      button.classList.remove("in-selection-mode");
      
      // Move the button back to the parent
      parent.insertBefore(button, wrapper);
    }
    
    // Remove the wrapper
    wrapper.remove();
  });
  
  // Hide selection mode buttons and show normal action buttons
  const actionButtons = document.getElementById("watchlist-actions");
  if (actionButtons) {
    document.querySelectorAll(".selection-mode-btn").forEach(btn => {
      btn.style.display = "none";
    });
    
    Array.from(actionButtons.querySelectorAll("button:not(.selection-mode-btn)")).forEach(
      btn => btn.style.display = "block"
    );
  }
}

// Confirm the selection and perform the appropriate action
function confirmSelection() {
  if (!isInSelectionMode || selectedWatchlists.length === 0) return;
  
  if (currentAction === "delete") {
    // Show a final confirmation
    if (confirm(`Are you sure you want to delete ${selectedWatchlists.length} watchlist(s)? This action cannot be undone.`)) {
      deleteSelectedWatchlists();
    }
  }
}

// Delete the selected watchlists
function deleteSelectedWatchlists() {
  // Disable the confirm button to prevent multiple clicks
  const confirmBtn = document.getElementById("confirm-selection-btn");
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerText = "Deleting...";
  }
  
  // Send the delete request to the server
  fetch("/watchlists/batch-delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ watchlist_ids: selectedWatchlists })
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === "success") {
      // Show success message
      alert(data.message || `Successfully deleted ${selectedWatchlists.length} watchlist(s)`);
      
      // Exit selection mode and refresh the watchlist display
      exitSelectionMode();
      fetchWatchlists();
    } else {
      alert(data.message || "Failed to delete watchlists. Please try again.");
      
      // Re-enable the button in case of error
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerText = "Delete Selected";
      }
    }
  })
  .catch(err => {
    console.error("Error deleting watchlists:", err);
    alert("An error occurred while deleting watchlists. Please try again.");
    
    // Re-enable the button in case of error
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerText = "Delete Selected";
    }
  });
}

//---------------------------------------------------//
function performSearch() {
  const query = document.getElementById("search-input").value;
  if (!query.trim()) return; // Prevent empty searches
  
  const resultsDiv = document.getElementById("results");
  if (resultsDiv) resultsDiv.innerHTML = "<p>Searching...</p>";
  
  fetch(`/search?query=${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(movies => {
      if (resultsDiv) {
        resultsDiv.innerHTML = "";
        if (movies.length > 0) {
          movies.forEach(movie => {
            // Format rating to display with stars or as number/10
            const ratingDisplay = movie.rating ? 
              `<div class="rating">⭐ ${movie.rating.toFixed(1)}/10</div>` : 
              '<div class="rating">Not rated</div>';
              
            const movieDiv = document.createElement("div");
            movieDiv.className = "movie";
            movieDiv.innerHTML = `
              <h3>${movie.title}</h3>
              <div class="movie-details">
                <p>Release Date: ${movie.release_date || 'Unknown'}</p>
                ${ratingDisplay}
              </div>
              <img src="${movie.poster_url || '/static/images/no-poster.png'}" alt="${movie.title} poster">
              <select id="list-select-${movie.movie_id}"></select>
              <button onclick="addToWatchlist(${movie.movie_id})">Add to Watchlist</button>
            `;
            resultsDiv.appendChild(movieDiv);

            const select = movieDiv.querySelector(`#list-select-${movie.movie_id}`);
            populateWatchlistSelect(select);
          });
        } else {
          resultsDiv.innerHTML = "<p>No movies found.</p>";
        }
      }
    })
    .catch(err => {
      console.error(err);
      if (resultsDiv) resultsDiv.innerHTML = "<p>Error searching for movies. Please try again.</p>";
    });
}

// Fetch watchlists and populate the UI with colored buttons
function fetchWatchlists() {
  fetch("/watchlists")
    .then(res => res.json())
    .then(lists => {
      const watchlistDiv = document.getElementById("watchlist");
      if (watchlistDiv) {
        if (lists.length === 0) {
          watchlistDiv.innerHTML = "<p>No watchlists yet. Create one!</p>";
        } else {
          watchlistDiv.innerHTML = "";
          
          // Create a button for each watchlist with its own color
          lists.forEach(list => {
            const watchlistBtn = document.createElement("button");
            watchlistBtn.className = "watchlist-button";
            watchlistBtn.textContent = list.name;
            watchlistBtn.dataset.id = list.watchlist_id;
            watchlistBtn.style.backgroundColor = list.color || "#007bff";
            
            // Adjust text color based on background brightness for better readability
            const isLightColor = isColorLight(list.color || "#007bff");
            watchlistBtn.style.color = isLightColor ? "#000" : "#fff";
            
            // Add click event (placeholder for future implementation)
            watchlistBtn.addEventListener("click", function() {
              // Only trigger if not in selection mode
              if (!isInSelectionMode) {
                viewWatchlist(list.watchlist_id);
              }
            });
            
            watchlistDiv.appendChild(watchlistBtn);
          });
        }
      }
    })
    .catch(err => console.error("Error fetching watchlists:", err));
}

// Helper function to determine if a color is light or dark
function isColorLight(hexColor) {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate brightness (perceived brightness formula)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return true if color is light (adjust threshold as needed)
  return brightness > 128;
}

// Populate a watchlist select dropdown
function populateWatchlistSelect(select) {
  if (!select) return;
  
  fetch("/watchlists")
    .then(res => res.json())
    .then(lists => {
      if (lists.length === 0) {
        select.innerHTML = '<option value="">Create a watchlist first</option>';
      } else {
        select.innerHTML = lists.map(list => 
          `<option value="${list.watchlist_id}">${list.name}</option>`
        ).join('');
      }
    })
    .catch(err => {
      console.error("Error loading watchlists for select:", err);
      select.innerHTML = '<option value="">Error loading watchlists</option>';
    });
}

// Add Movie to Watchlist
function addToWatchlist(movieId) {
  const select = document.getElementById(`list-select-${movieId}`);
  if (!select) return;
  
  const watchlistId = select.value;
  if (!watchlistId) {
    alert("Please create a watchlist first!");
    return;
  }
  
  fetch(`/watchlists/${watchlistId}/movies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ movie_id: movieId })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || "Movie added to watchlist!");
    })
    .catch(() => alert("Failed to add movie to watchlist."));
}

// View a specific watchlist's contents
function viewWatchlist(watchlistId) {
  window.location.href = `/watchlist/${watchlistId}`;
}


//---------------------------------------------------------//
// Variables for movie selection mode
let isInMovieSelectionMode = false;
let selectedMovies = [];

// Initialize when document is ready
document.addEventListener("DOMContentLoaded", function() {
    // Check if we're on a watchlist detail page
    const deleteMoviesBtn = document.getElementById("delete-movies-btn");
    if (deleteMoviesBtn) {
        // Set up the delete movies button
        deleteMoviesBtn.addEventListener("click", enterMovieSelectionMode);
        
        // Set up cancel and confirm buttons
        document.getElementById("cancel-selection-btn")?.addEventListener("click", exitMovieSelectionMode);
        document.getElementById("confirm-delete-btn")?.addEventListener("click", confirmDeleteMovies);

    }
});


// Enter selection mode for movies
function enterMovieSelectionMode() {
    isInMovieSelectionMode = true;
    selectedMovies = [];
    
    // Update UI
    document.getElementById("delete-movies-btn").style.display = "none";
    document.getElementById("selection-actions").style.display = "flex";
    
    // Add checkboxes to movie cards
    document.querySelectorAll(".movie-card").forEach(card => {
        // Get movie ID directly from data attribute
        const movieId = card.dataset.movieId;
        
        if (!movieId) {
            console.error("Movie card missing data-movie-id attribute:", card);
            return;
        }
        
        // Create checkbox
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "movie-checkbox";
        checkbox.dataset.movieId = movieId;
        
        // Add selection overlay
        const overlay = document.createElement("div");
        overlay.className = "selection-overlay";
        overlay.appendChild(checkbox);
        card.appendChild(overlay);
        
        // Make card selectable
        card.classList.add("in-selection-mode");
        card.addEventListener("click", function(e) {
            if (!isInMovieSelectionMode) return;
            if (e.target !== checkbox) {
                e.preventDefault();
                checkbox.checked = !checkbox.checked;
            }
            
            // Update selection
            if (checkbox.checked && !selectedMovies.includes(movieId)) {
                selectedMovies.push(movieId);
            } else if (!checkbox.checked) {
                selectedMovies = selectedMovies.filter(id => id !== movieId);
            }
            
            // Update counter
            document.getElementById("selection-counter").textContent = 
                `${selectedMovies.length} selected`;
            
            // Update delete button state
            const confirmBtn = document.getElementById("confirm-delete-btn");
            confirmBtn.disabled = selectedMovies.length === 0;
            confirmBtn.style.opacity = selectedMovies.length === 0 ? "0.5" : "1";
        });
    });
    
    // Initialize counter
    document.getElementById("selection-counter").textContent = "0 selected";
    
    // Disable delete button initially
    const confirmBtn = document.getElementById("confirm-delete-btn");
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = "0.5";
}

//---------------------------------------------------//
// Exit selection mode
function exitMovieSelectionMode() {
    isInMovieSelectionMode = false;
    
    // Restore UI
    document.getElementById("delete-movies-btn").style.display = "block";
    document.getElementById("selection-actions").style.display = "none";
    
    // Remove selection UI
    document.querySelectorAll(".movie-card").forEach(card => {
        // Remove selection overlay
        card.querySelector(".selection-overlay")?.remove();
        
        // Remove selection mode class
        card.classList.remove("in-selection-mode");
    });
    
    // Clear selection
    selectedMovies = [];
}

// Delete selected movies
function confirmDeleteMovies() {
    if (!selectedMovies.length) return;
    
    // Get watchlist ID from URL
    const watchlistId = window.location.pathname.match(/\/watchlist\/(\d+)/)[1];
    
    // Confirm deletion
    if (!confirm(`Remove ${selectedMovies.length} movies from this watchlist?`)) {
        return;
    }
    
    // Disable buttons
    document.getElementById("confirm-delete-btn").disabled = true;
    // document.getElementById("confirm-delete-btn").textContent = "Deleting...";
    document.getElementById("cancel-selection-btn").disabled = true;
    
    // Delete request
    fetch(`/watchlists/${watchlistId}/movies/batch-delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movie_ids: selectedMovies })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {
            // Remove movies from DOM
            selectedMovies.forEach(movieId => {
                const card = document.querySelector(`.movie-checkbox[data-movie-id="${movieId}"]`)
                    ?.closest(".movie-card");
                
                if (card) {
                    // Animate removal
                    card.style.transition = "all 0.3s";
                    card.style.opacity = "0";
                    setTimeout(() => card.remove(), 300);
                }
            });
            
            // Check if grid is empty
            setTimeout(() => {
                const grid = document.querySelector(".movie-grid");
                if (grid && grid.children.length === 0) {
                    grid.remove();
                    
                    const emptyState = document.createElement("p");
                    emptyState.className = "empty-state";
                    emptyState.innerHTML = 'No movies in this watchlist yet. <a href="/home">Go search</a> for movies to add!';
                    
                    document.querySelector(".watchlist-detail").appendChild(emptyState);
                }
            }, 400);
            
            // Show message
            showMessage(data.message, "success");
            
            // Exit selection mode
            exitMovieSelectionMode();
        } else {
            alert(data.message || "Failed to delete movies");
            // Re-enable buttons
            document.getElementById("confirm-delete-btn").disabled = false;
            document.getElementById("confirm-delete-btn").textContent = "Delete Selected";
            document.getElementById("cancel-selection-btn").disabled = false;
        }
    })
    .catch(err => {
        console.error("Error:", err);
        alert("An error occurred while deleting movies");
        // Re-enable buttons
        document.getElementById("confirm-delete-btn").disabled = false;
        document.getElementById("confirm-delete-btn").textContent = "Delete Selected";
        document.getElementById("cancel-selection-btn").disabled = false;
    });
}

//---------------------------------------------------//
// Show flash message
function showMessage(message, type) {
    // Find or create flash container
    let flashContainer = document.querySelector(".flash-messages");
    if (!flashContainer) {
        flashContainer = document.createElement("div");
        flashContainer.className = "flash-messages";
        document.querySelector(".container").prepend(flashContainer);
    }
    
    // Create message
    const flashMessage = document.createElement("div");
    flashMessage.className = `flash ${type}`;
    flashMessage.textContent = message;
    flashContainer.appendChild(flashMessage);
    
    // Auto-hide
    setTimeout(() => {
        flashMessage.style.transition = "opacity 1s";
        flashMessage.style.opacity = "0";
        setTimeout(() => flashMessage.remove(), 1000);
    }, 3000);
}



//---------------------------------------------------//
document.addEventListener('DOMContentLoaded', function() {
    // Set up notes editing if on watchlist detail page
    initNotesEditing();
});

// Initialize notes editing functionality
function initNotesEditing() {
    const editNotesBtn = document.getElementById('edit-notes-btn');
    const cancelNotesBtn = document.getElementById('cancel-notes-btn');
    const saveNotesBtn = document.getElementById('save-notes-btn');
    
    if (!editNotesBtn) return; // Not on watchlist detail page
    
    // Set up edit button
    editNotesBtn.addEventListener('click', function() {
        document.getElementById('notes-display').style.display = 'none';
        document.getElementById('notes-editor').style.display = 'block';
        document.getElementById('notes-textarea').focus();
    });
    
    // Set up cancel button
    cancelNotesBtn.addEventListener('click', function() {
        document.getElementById('notes-editor').style.display = 'none';
        document.getElementById('notes-display').style.display = 'block';
        
        // Reset textarea to original value
        const originalNotes = document.querySelector('.notes-display p').innerText;
        document.getElementById('notes-textarea').value = originalNotes === 'No notes yet. Click the edit button to add notes.' ? '' : originalNotes;
    });
    
    // Set up save button
    saveNotesBtn.addEventListener('click', function() {
        const notes = document.getElementById('notes-textarea').value;
        const watchlistId = getWatchlistIdFromUrl();
        
        if (!watchlistId) {
            alert('Could not determine watchlist ID');
            return;
        }
        
        // Save button state
        const originalText = saveNotesBtn.innerText;
        saveNotesBtn.innerText = 'Saving...';
        saveNotesBtn.disabled = true;
        
        // Send update request
        fetch(`/watchlists/${watchlistId}/notes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notes: notes })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Update the displayed notes
                const notesDisplay = document.getElementById('notes-display');
                if (notes.trim() === '') {
                    notesDisplay.innerHTML = '<p class="no-notes">No notes yet. Click the edit button to add notes.</p>';
                } else {
                    notesDisplay.innerHTML = `<p>${notes}</p>`;
                }
                
                // Hide editor, show display
                document.getElementById('notes-editor').style.display = 'none';
                document.getElementById('notes-display').style.display = 'block';
                
                // Show success message
                showMessage('Notes updated successfully', 'success');
            } else {
                alert(data.message || 'Failed to update notes');
            }
        })
        .catch(error => {
            console.error('Error updating notes:', error);
            alert('An error occurred while saving notes');
        })
        .finally(() => {
            // Restore button state
            saveNotesBtn.innerText = originalText;
            saveNotesBtn.disabled = false;
        });
    });
}

// Helper function to get watchlist ID from URL
function getWatchlistIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/watchlist\/(\d+)/);
    return match ? match[1] : null;
}


//---------------------------------------------------//
