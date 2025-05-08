const API_KEY = '93cbafc8eb18a0eb9ec3ee3dbe8daa40';
        const libraryKey = 'movieLibrary';
        let movieLibrary = JSON.parse(localStorage.getItem(libraryKey)) || [];

        function searchMovies() {
            const query = document.getElementById("searchInput").value;
            let url = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${query}`;
            
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    const resultsDiv = document.getElementById("results");
                    resultsDiv.innerHTML = "";
                    
                    data.results.forEach(movie => {
                        const card = document.createElement("div");
                        card.className = "col-md-4";
                        card.innerHTML = `
                            <div class="card h-100">
                                <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" class="card-img-top" alt="${movie.title}">
                                <div class="card-body">
                                    <h5 class="card-title">${movie.title}</h5>
                                    <p class="card-text">${movie.overview.substring(0, 100)}...</p>
                                    <button class="btn btn-success" onclick="addToLibrary(${movie.id}, '${movie.title}', '${movie.poster_path}')">Add to Library</button>
                                </div>
                            </div>`;
                        resultsDiv.appendChild(card);
                    });
                })
                .catch(error => console.error("Error fetching data:", error));
        }

        function showToast(message) {
            const toastEl = document.getElementById('toast');
            const toastMsg = document.getElementById('toastMsg');
            toastMsg.textContent = message;
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
        }

        function addToLibrary(id, title, poster) {
            if (!movieLibrary.some(movie => movie.id === id)) {
                movieLibrary.push({ id, title, poster, status: "Planning to Watch" });
                localStorage.setItem(libraryKey, JSON.stringify(movieLibrary));
                renderLibrary();
                showToast('Movie added to playlist!');
            }
        }

        function removeFromLibrary(id) {
            movieLibrary = movieLibrary.filter(movie => movie.id !== id);
            localStorage.setItem(libraryKey, JSON.stringify(movieLibrary));
            renderLibrary();
            showToast('Movie removed from playlist!');
        }

        function changeStatus(id, newStatus) {
            const movie = movieLibrary.find(movie => movie.id === id);
            if (movie) {
                movie.status = newStatus;
                localStorage.setItem(libraryKey, JSON.stringify(movieLibrary));
                renderLibrary();
            }
        }

        function renderLibrary() {
            const libraryDiv = document.getElementById("library");
            libraryDiv.innerHTML = "";
            
            movieLibrary.forEach(movie => {
                const card = document.createElement("div");
                card.className = "col-md-4";
                card.innerHTML = `
                    <div class="card h-100">
                        <img src="https://image.tmdb.org/t/p/w500${movie.poster}" class="card-img-top" alt="${movie.title}">
                        <div class="card-body">
                            <h5 class="card-title">${movie.title}</h5>
                            <p class="card-text">Status: ${movie.status}</p>
                            <select class="form-select mb-2" onchange="changeStatus(${movie.id}, this.value)">
                                <option ${movie.status === "Planning to Watch" ? "selected" : ""}>Planning to Watch</option>
                                <option ${movie.status === "Watched" ? "selected" : ""}>Watched</option>
                                <option ${movie.status === "Dropped" ? "selected" : ""}>Dropped</option>
                            </select>
                            <button class="btn btn-danger" onclick="removeFromLibrary(${movie.id})">Remove</button>
                        </div>
                    </div>`;
                libraryDiv.appendChild(card);
            });
        }
        
        document.addEventListener("DOMContentLoaded", function() {
            renderLibrary();
            
            // Add event listener for the search button
            document.getElementById("searchBtn").addEventListener("click", searchMovies);
            
            // Add event listener for Enter key in search input
            document.getElementById("searchInput").addEventListener("keypress", function(event) {
                if (event.key === "Enter") {
                    searchMovies();
                }
            });
        });