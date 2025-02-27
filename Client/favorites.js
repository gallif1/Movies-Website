document.addEventListener("DOMContentLoaded", function () {
    const userEmail = sessionStorage.getItem('userEmail');
    const userName = sessionStorage.getItem('userUsername');

    if (!userEmail || !userName) {
        window.location.href = '/login.html';
        return;
    }

    document.getElementById('username').textContent = userName;
    loadFavorites();

    // Event listeners for sorting
    document.getElementById('sort-rating').addEventListener('click', () => sortFavorites('rating'));
    document.getElementById('sort-date').addEventListener('click', () => sortFavorites('year'));
    document.getElementById('sort-name').addEventListener('click', () => sortFavorites('title'));

    document.getElementById('logoutButton').addEventListener('click', function() {
        fetch('/logout', { method: 'GET' })
            .then(() => {
                sessionStorage.clear();
                window.location.href = '/';
            })
            .catch(err => console.error("Error logging out:", err));
    });
});

        function loadFavorites() {
            const userEmail = sessionStorage.getItem('userEmail');
            if (!userEmail) {
                document.getElementById('favorites-container').innerHTML = 
                    '<div class="alert alert-danger">User not logged in or session expired.</div>';
                return;
            }

            fetch(`/favorites/${userEmail}`)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(favorites => {
                    const favoritesContainer = document.getElementById('favorites-container');
                    favoritesContainer.innerHTML = '';

                    if (favorites.length === 0) {
                        favoritesContainer.innerHTML = '<div class="alert alert-info">No favorites yet!</div>';
                        return;
                    }

                    fetchFavoritesDetails(favorites).then(movies => renderFavorites(movies, favoritesContainer));
                })
                .catch(err => {
                    console.error("Error loading favorites:", err);
                    document.getElementById('favorites-container').innerHTML = 
                        `<div class="alert alert-danger">Failed to load favorites: ${err.message}</div>`;
                });
        }

        async function fetchFavoritesDetails(favorites) {
            const promises = favorites.map(imdbID =>
                fetch(`http://www.omdbapi.com/?apikey=7ccf874&i=${imdbID}`).then(response => response.json())
            );
            return await Promise.all(promises);
        }

        function renderFavorites(movies, container) {
            container.innerHTML = ''; // Clear the container before rendering
            movies.forEach(movie => {
                if (movie.Response === "True") {
                    container.innerHTML += `
                        <div class="col-md-4 mb-4">
                            <div class="card">
                                <img src="${movie.Poster}" class="card-img-top" alt="${movie.Title}">
                                <div class="card-body">
                                    <h5 class="card-title">${movie.Title} (${movie.Year})</h5>
                                    <p class="card-text">Rating: ${movie.imdbRating}</p>
                                    <p class="card-text">Director: ${movie.Director}</p>
                                    <button class="btn btn-danger" onclick="toggleFavorite('${movie.imdbID}')">Remove from Favorites</button>
                                    <a href="/details.html?imdbID=${movie.imdbID}" class="btn btn-info mt-2">View Details</a>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
        }

        function sortFavorites(criteria) {
            const favoritesContainer = document.getElementById('favorites-container');
            const movieCards = Array.from(favoritesContainer.children);
            
            movieCards.sort((a, b) => {
                const aValue = getValueForCriteria(a, criteria);
                const bValue = getValueForCriteria(b, criteria);
                
                if (criteria === 'rating' || criteria === 'year') {
                    return bValue - aValue; // Descending order
                } else {
                    return aValue.localeCompare(bValue); // Alphabetical order
                }
            });
            
            favoritesContainer.innerHTML = '';
            movieCards.forEach(card => favoritesContainer.appendChild(card));
        }

        function getValueForCriteria(card, criteria) {
            switch (criteria) {
                case 'rating':
                    return parseFloat(card.querySelector('.card-text').textContent.split(': ')[1]);
                case 'year':
                    return parseInt(card.querySelector('.card-title').textContent.match(/\((\d{4})\)/)[1]);
                case 'title':
                    return card.querySelector('.card-title').textContent.split(' (')[0];
                default:
                    return '';
            }
        }

        function toggleFavorite(imdbID) {
            const userEmail = sessionStorage.getItem('userEmail');
            if (!userEmail) {
                Swal.fire('Error', 'Please log in first', 'error');
                return;
            }

            fetch('/update-favorite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, movieId: imdbID })
            })
                .then(response => response.json())
                .then(data => {
                    Swal.fire('Success', `Movie ${data.action} your favorites`, 'success');
                    loadFavorites();
                })
                .catch(err => {
                    console.error("Error:", err);
                    Swal.fire('Error', 'Failed to update favorites', 'error');
                });
        }

        function goBackToHomePage() {
            window.location.href = '/index.html';
        }