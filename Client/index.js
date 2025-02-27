

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM fully loaded and parsed.");
    const username = sessionStorage.getItem('userUsername');
    const userRole = sessionStorage.getItem('userRole');
    
    console.log(`🔹 Checking role from sessionStorage: ${userRole}`);

    if (!username) {
        window.location.href = '/login.html';
        return;
    }

    document.getElementById('username').textContent = username;

    // הצגת כפתור ה-Admin רק אם המשתמש הוא ADMIN
    const adminButton = document.getElementById('adminButton');
    if (userRole === 'ADMIN') {
        console.log("✅ User is ADMIN, displaying Admin button.");
        adminButton.style.display = 'inline-block';
    } else {
        console.log("🚫 User is NOT ADMIN, hiding Admin button.");
    }

    // Logout button click handler
    document.getElementById('logoutButton').addEventListener('click', function () {
        fetch('/logout', { method: 'GET' })
            .then(() => {
                sessionStorage.clear();
                window.location.href = '/';
            })
            .catch(err => console.error("❌ Error logging out:", err));
    });

    // כפתור ה-Admin מפנה ללוח ניהול
    adminButton.addEventListener('click', function () {
        window.location.href = '/admin.html';
    });

    // כפתור המועדפים
    document.getElementById('redirectButton').addEventListener('click', function() {
        window.location.href = '/favorites.html';
    });

    // כפתור Highest Rated
    document.getElementById('highestRatedButton').addEventListener('click', function() {
        window.location.href = '/highest-rated-link.html';
    });

    // חיפוש סרטים
    const searchInput = document.getElementById("search-txt");
    const moviesContainer = document.getElementById("movies-container");

    const lastSearch = sessionStorage.getItem("lastSearch");
    if (lastSearch) {
        searchInput.value = lastSearch;
        fetchMovies(lastSearch);
    }

    searchInput.addEventListener('input', function () {
        const query = searchInput.value;
        if (query.length > 3) {
            sessionStorage.setItem("lastSearch", query);
            fetchMovies(query);
        } else {
            moviesContainer.innerHTML = "";
        }
    });

    function fetchMovies(query) {
        moviesContainer.innerHTML = "";
        console.log(`🔎 Fetching movies for: ${query}`);
        if (typeof MovieAPI !== 'undefined' && MovieAPI.fetchMovies) {
            MovieAPI.fetchMovies(query).then(movies => MovieAPI.RenderMoviesCard(movies, moviesContainer));
        } else {
            console.error("❌ MovieAPI is not defined!");
        }
    }
});

// טיפול בהתחברות
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(response => response.json())
        .then(data => {
            console.log("🔹 Server Response:", data);
            
            if (data.success) {
                console.log(`✅ Logged in as: ${data.user.username}, Role: ${data.user.role}`);

                sessionStorage.setItem('userUsername', data.user.username);
                sessionStorage.setItem('userRole', data.user.role);
                
                console.log("🔹 Session Storage Updated:", {
                    userUsername: sessionStorage.getItem('userUsername'),
                    userRole: sessionStorage.getItem('userRole')
                });
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 500);
            } else {
                console.error("❌ Login failed:", data.message);
                alert(data.message);
            }
        })
        .catch(err => console.error("❌ Login error:", err));
    });
}