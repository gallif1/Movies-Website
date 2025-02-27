

const API_KEY = '7ccf874'; 
const BASE_URL = 'http://www.omdbapi.com/';

class Movie {
    constructor(id, title, year, plot, imdbid, poster) {
        this.id = id;
        this.title = title;
        this.year = year;
        this.plot = plot;
        this.imdbid = imdbid;
        this.poster = poster;
        this.links = [];
    }

    // הוספת לינק
    addLink(name, url, description) {
        this.links.push({ name, url, description });
    }

    // הסרת לינק
    removeLink(name) {
        this.links = this.links.filter(link => link.name !== name);
    }

    // עדכון לינק
    updateLink(name, url, description) {
        this.links = this.links.map(link => 
            link.name === name ? { name, url, description } : link
        );
    }
}

class MovieAPI {

    // קבלת סרטים לפי חיפוש
    static async fetchMovies(query) {
        const response = await fetch(`${BASE_URL}?apikey=${API_KEY}&s=${query}`);
        const data = await response.json();

        if ((data.Response) === "True") {
            let moviesListFound = data.Search;
            return moviesListFound.map(m => new Movie(m.imdbID, m.Title, m.Year, m.Plot, m.imdbID, m.Poster));
        }
        return [];
    }

    // קבלת פרטי סרט לפי imdbid
    static async fetchMoviesDetails(imdbid) {
        let response = await fetch(`${BASE_URL}?apikey=${API_KEY}&i=${imdbid}`);
        const data = await response.json();

        if ((data.Response) === "True") {
            return new Movie(data.imdbID, data.Title, data.Year, data.Plot, data.imdbID, data.Poster);
        }

        return null;
    }

    // פונקציה לרינדור כרטיסי הסרטים
    static RenderMoviesCard(movies, container) {
        movies.forEach(movie => {
            const card = `
                <div class="col-md-3 mb-4">
                    <div class="card" style="width: 18rem;">
                        <img src="${movie.poster}" class="card-img-top" alt="${movie.title}">
                        <div class="card-body">
                            <h5 class="card-title">${movie.title}</h5>
                            <p class="card-text">${movie.year}</p>
                            <a href="details.html?imdbID=${movie.imdbid}" class="btn btn-primary">Details</a>
                        </div>
                    </div> 
                </div> 
            `;

            // הוספת כרטיס ל-HTML
            container.insertAdjacentHTML('beforeend', card);
        });
    }
}

// פונקציה להוספת לינק למועדפים
async function addLink(movieId, name, url, description) {
    const response = await fetch('/add-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUserEmail, movieId, name, url, description }) 
    });

    if (response.ok) {
        alert("Link added to favorites!");
    } else {
        const errorText = await response.text();
        alert(errorText);
    }
}

// פונקציה להסרת לינק מהמועדפים
async function removeLink(movieId, name) {
    const response = await fetch('/remove-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUserEmail, movieId, name })
    });

    if (response.ok) {
        alert("Link removed from favorites!");
    } else {
        const errorText = await response.text();
        alert(errorText);
    }
}

// פונקציה לעדכון לינק במועדפים
async function updateLink(movieId, oldName, newName, newUrl, newDescription) {
    const response = await fetch('/update-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUserEmail, movieId, oldName, newName, newUrl, newDescription })
    });

    if (response.ok) {
        alert("Link updated!");
    } else {
        const errorText = await response.text();
        alert(errorText);
    }
}

// פונקציה לקרוא את הלינקים המועדפים
async function fetchLinks(movieId) {
    const response = await fetch(`/get-links/${currentUserEmail}/${movieId}`);
    
    if (response.ok) {
        const links = await response.json();
        console.log(links); // הצגת הלינקים בעורך
    } else {
        alert("Error fetching links.");
    }
}
