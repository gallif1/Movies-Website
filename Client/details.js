

const API_KEY = '7ccf874';
const BASE_URL = 'http://www.omdbapi.com/';

document.addEventListener("DOMContentLoaded", function () {
    const username = sessionStorage.getItem('userUsername');
    if (!username) {
        window.location.href = '/login.html';
        return;
    }
    
    document.getElementById('username').textContent = username;
    
    const imdbID = new URLSearchParams(window.location.search).get('imdbID');
    if (imdbID) {
        fetch(`${BASE_URL}?apikey=${API_KEY}&i=${imdbID}`)
            .then(response => response.json())
            .then(data => {
                if (data.Response === "True") {
                    document.getElementById('movie-title').textContent = `${data.Title} (${data.Year})`;
                    document.getElementById('movie-details').innerHTML = `
                        <div class="col-md-4">
                            <img src="${data.Poster}" alt="${data.Title} Poster" class="img-fluid">
                        </div>
                        <div class="col-md-8">
                            <p><strong>Director:</strong> ${data.Director}</p>
                            <p><strong>Actors:</strong> ${data.Actors}</p>
                            <p><strong>Plot:</strong> ${data.Plot}</p>
                            <p><strong>Genre:</strong> ${data.Genre}</p>
                            <p><strong>IMDB Rating:</strong> ${data.imdbRating}</p>
                        </div>
                    `;

                    document.getElementById('imdb-link').href = `https://www.imdb.com/title/${data.imdbID}`;
                    const favoriteBtn = document.getElementById('favorite-btn');
                    
                    // Check favorite status
                    checkFavoriteStatus(imdbID, favoriteBtn, data);
                    
                    // Add link button event listener
                    document.getElementById('add-link-btn').addEventListener('click', () => addLink(data.imdbID));
                } else {
                    document.body.innerHTML = '<div class="alert alert-danger">Movie not found!</div>';
                }
            })
            .catch(error => {
                console.error('Error fetching movie data:', error);
                document.body.innerHTML = '<div class="alert alert-danger">Error fetching movie details.</div>';
            });
    } else {
        document.body.innerHTML = '<div class="alert alert-danger">No IMDb ID provided in the URL!</div>';
    }
});

function goBackToHomePage() {
    window.location.href = '/index.html';
}

async function checkFavoriteStatus(imdbID, favoriteBtn, movieData) {
    const email = sessionStorage.getItem('userEmail');
    if (!email) return;

    try {
        const response = await fetch(`/favorites/${email}`);
        const favorites = await response.json();
        const isFavorite = favorites.includes(imdbID);
        
        updateFavoriteButton(favoriteBtn, isFavorite);
        updateLinksSection(isFavorite, imdbID);
        
        favoriteBtn.addEventListener('click', () => toggleFavorite(movieData));
    } catch (error) {
        console.error('Error checking favorite status:', error);
    }
}

async function toggleFavorite(movie) {
    const imdbID = movie.imdbID;
    const email = sessionStorage.getItem('userEmail');
    
    if (!email) {
        Swal.fire('Error', 'Please log in first', 'error');
        return;
    }

    try {
        const response = await fetch('/update-favorite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                movieId: imdbID
            })
        });

        const result = await response.json();
        
        updateFavoriteButton(document.getElementById('favorite-btn'), result.isFavorite);
        updateLinksSection(result.isFavorite, imdbID);
        
        Swal.fire('Success', `${movie.Title} has been ${result.action} your favorites.`, 'success');
        return result.isFavorite;
    } catch (error) {
        console.error('Error updating favorites:', error);
        Swal.fire('Error', 'Failed to update favorites', 'error');
        return false;
    }
}


function updateFavoriteButton(button, isFavorite) {
    if (!button) return;
    button.textContent = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
    button.classList.toggle('btn-danger', isFavorite);
    button.classList.toggle('btn-primary', !isFavorite);
}

function updateLinksSection(isFavorite, imdbID) {
    const linksSection = document.getElementById('links-section');
    if (!linksSection) return;
    
    linksSection.style.display = isFavorite ? 'block' : 'none';
    if (isFavorite) {
        loadLinks(imdbID);
    }
}

async function addLink(imdbID) {
    const email = sessionStorage.getItem('userEmail');
    if (!email) {
        Swal.fire('Error', 'Please log in first', 'error');
        return;
    }

    Swal.fire({
        title: 'Add Link',
        html: `
            <input type="text" id="link-name" class="swal2-input" placeholder="Name">
            <input type="url" id="link-url" class="swal2-input" placeholder="URL">
            <textarea id="link-description" class="swal2-textarea" placeholder="Description"></textarea>
            <br>
            <label>
                <input type="radio" name="link-type" id="public-radio"> Public
            </label>
            <br>
            <label>
                <input type="radio" name="link-type" id="private-radio"> Private
            </label>
        `,
        confirmButtonText: 'Add',
        showCancelButton: true,
        cancelButtonText: 'Cancel',
    }).then(result => {
        if (result.isConfirmed) {
            const name = document.getElementById('link-name').value;
            const url = document.getElementById('link-url').value;
            const description = document.getElementById('link-description').value;
            const isPublic = document.getElementById('public-radio').checked;

            if (!name || !url) {
                Swal.fire('Error', 'Name and URL are required!', 'error');
                return;
            }

            if (!document.getElementById('public-radio').checked && !document.getElementById('private-radio').checked) {
                Swal.fire('Error', 'Please select Public or Private.', 'error');
                return;
            }

            fetch('/add-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    imdbID,
                    name,
                    url,
                    description,
                    isPublic // שולח לשרת 1 אם זה public, ו-0 אם זה private
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Link added.') {
                    loadLinks(imdbID);
                    Swal.fire('Success', 'Link added successfully!', 'success');
                } else {
                    Swal.fire('Error', 'Failed to add link.', 'error');
                }
            });
        }
    });
}

document.getElementById('logoutButton').addEventListener('click', function () {
    fetch('/logout', { method: 'GET' })
        .then(() => {
            sessionStorage.clear();
            window.location.href = '/';
        })
        .catch(err => console.error("❌ Error logging out:", err));
});

async function handleLinkClick(linkId, url) {
    try {
        // פותח את הקישור מיד כדי להימנע מחסימת חלונות קופצים
        const newTab = window.open(url, '_blank');

        // שולח בקשה לשרת כדי לעדכן את מספר הקליקים
        await fetch(`/update-clicks/${linkId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('Error updating clicks:', err);
        Swal.fire('Error', 'Failed to update clicks', 'error');
    }
}


let currentPage = 1;
const linksPerPage = 3; // 🔹 עכשיו זה 3 לינקים בעמוד


async function loadLinks(imdbID, page = 1) {
    const email = sessionStorage.getItem('userEmail');
    if (!email) {
        console.error('User not logged in');
        Swal.fire('Error', 'User not logged in', 'error');
        return;
    }

    try {
        const response = await fetch(`/get-links/${email}/${imdbID}?page=${page}&limit=${linksPerPage}`);

        // בדוק את סטטוס התגובה לפני ניסיון לקרוא JSON
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.links || !Array.isArray(data.links)) {
            throw new Error('Invalid response format: Missing links array');
        }

        displayLinks(data.links, imdbID);
        updatePaginationControls(imdbID, data.page, data.totalPages);

    } catch (err) {
        console.error('Error loading links:', err);
        Swal.fire('Error', `Failed to load links: ${err.message}`, 'error');
    }
}


function displayLinks(links, imdbID) {
    const linksList = document.getElementById('links-list');
    console.log('...............');
    console.log(imdbID);
    console.log('...............');
    if (!Array.isArray(links) || links.length === 0) {
        console.warn("⚠️ No links available!");
        linksList.innerHTML = '<li class="list-group-item">No links available for this movie.</li>';
        return;
    }

    if (!imdbID) {
        console.error("❌ Error: imdbID is undefined!");
        Swal.fire('Error', 'Invalid IMDb ID', 'error');
        return;
    }

    linksList.innerHTML = links.map(link => {
        console.log(`🔹 Checking link:`, link);

        if (!link.id) {
            console.warn(`⚠️ link.id is missing or null for link:`, link);
            return ''; // אם אין ID, לא נציג את האלמנט
        }

        return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${link.name}</strong>
                    <a href="#" onclick="handleLinkClick('${link.id}', '${link.url}')" class="ms-2">${link.url}</a>
                    <p class="mb-0 mt-1">${link.description || ''}</p>
                    <p><strong>Current Rating:</strong> ${link.rating || 'No rating yet'}</p>
                </div>
                <div>
                ${link.isOwner || sessionStorage.getItem('userRole') === 'ADMIN' ? `
                    <button class="btn btn-sm btn-warning me-2" onclick="editLink('${imdbID}', '${link.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteLink('${imdbID}', '${link.id}')">Delete</button>
                ` : ''}                
                    <button class="btn btn-sm btn-info me-2" onclick="rateLink('${imdbID}', '${link.id}')">Rate this Link</button>
                </div>
            </li>
        `;
    }).join('');
}







function updatePaginationControls(imdbID, currentPage, totalPages) {
    const paginationControls = document.getElementById('pagination-controls');

    paginationControls.innerHTML = `
        <button class="btn btn-secondary me-2" onclick="loadLinks('${imdbID}', ${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>Previous</button>
        <span> Page ${currentPage} of ${totalPages} </span>
        <button class="btn btn-secondary ms-2" onclick="loadLinks('${imdbID}', ${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
    `;
}



async function rateLink(imdbID, linkId) {
    const email = sessionStorage.getItem('userEmail');
    if (!email) {
        Swal.fire('Error', 'Please log in first', 'error');
        return;
    }

    const { value: rating } = await Swal.fire({
        title: 'Rate this Link',
        input: 'range',
        inputAttributes: {
            min: 1,
            max: 5,
            step: 1
        },
        inputValue: 3, // ערך ברירת מחדל
        showCancelButton: true,
        confirmButtonText: 'Submit Rating',
        cancelButtonText: 'Cancel'
    });

    if (!rating) {
        console.log("User cancelled the rating.");
        return;
    }

    console.log('Fetching current rating data for:', { imdbID, linkId });

    try {
        
        // חישוב הדירוג החדש כממוצע
     
        const response = await fetch('/update-rating', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imdbID,
                linkId,
                rating
            })
        });
        const jsonSum = await getSumRating(imdbID, linkId);
        console.log(jsonSum);

        const result = await response.json();
        if (result.success) {
            Swal.fire('Success', 'Your rating has been updated!', 'success');
            loadLinks(imdbID);
        } else {
            Swal.fire('Error', 'Failed to update rating', 'error');
        }
    } catch (error) {
        console.error('Error updating rating:', error);
        Swal.fire('Error', 'Failed to update rating', 'error');
    }
}



async function editLink(imdbID, linkId) {
    const email = sessionStorage.getItem('userEmail');
    if (!email) {
        Swal.fire('Error', 'User not logged in', 'error');
        return;
    }

    try {
        const response = await fetch(`/get-links/${email}/${imdbID}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Error fetching links:", errorText);
            Swal.fire('Error', 'Failed to fetch links', 'error');
            return;
        }
        
        const data = await response.json();
        const links = Array.isArray(data) ? data : data.links || []; // בדיקת סוג הנתון
        
        console.log("🔍 Links data:", links);

        const link = links.find(l => l.id === parseInt(linkId));
        if (!link) {
            Swal.fire('Error', 'Link not found', 'error');
            return;
        }

        const { value: formValues } = await Swal.fire({
            title: 'Edit Link',
            html: `
                <input type="text" id="edit-link-name" class="swal2-input" value="${link.name}" placeholder="Name">
                <input type="url" id="edit-link-url" class="swal2-input" value="${link.url}" placeholder="URL">
                <textarea id="edit-link-description" class="swal2-textarea" placeholder="Description">${link.description || ''}</textarea>
            `,
            focusConfirm: false,
            confirmButtonText: 'Update',
            showCancelButton: true,
            preConfirm: () => {
                const name = document.getElementById('edit-link-name').value;
                const url = document.getElementById('edit-link-url').value;
                const description = document.getElementById('edit-link-description').value;

                if (!name || !url) {
                    Swal.showValidationMessage('Name and URL are required');
                    return false;
                }
                return { name, url, description };
            }
        });

        if (formValues) {
            const updateResponse = await fetch(`/edit-link/${linkId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    imdbID,
                    name: formValues.name,
                    url: formValues.url,
                    description: formValues.description
                })
            });

            const updateResult = await updateResponse.json();
            if (updateResult.message === 'Link updated successfully') {
                Swal.fire('Success', 'Link updated successfully', 'success');
                loadLinks(imdbID);
            } else {
                Swal.fire('Error', 'Failed to update link', 'error');
            }
        }
    } catch (error) {
        console.error('Error editing link:', error);
        Swal.fire('Error', error.message || 'Failed to edit link', 'error');
    }
}



async function deleteLink(imdbID, linkId) {
    console.log('.............')
    console.log(linkId);
    console.log('.............')

    const email = sessionStorage.getItem('userEmail');
    if (!email) {
        Swal.fire('Error', 'Please log in first', 'error');
        return;
    }

    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });
    
    if (result.isConfirmed) {
        const response = await fetch(`/delete-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                imdbID,
                linkId  // שליחת ה-ID למחיקה
            })
        });

        const deleteResult = await response.json();
        if (deleteResult.message === 'Link deleted.') {
            Swal.fire('Deleted!', 'Your link has been deleted.', 'success');
            loadLinks(imdbID);  // טוען מחדש את הלינקים
        } else {
            Swal.fire('Error', 'Failed to delete link', 'error');
        }
    }
}

async function getSumRating(imdbID, linkId) {
    try {
        const response = await fetch(`/get-all-rating/${encodeURIComponent(imdbID)}/${encodeURIComponent(linkId)}`);
        const data = await response.json();

        console.log('Response:', data);
        return data; // החזרת הנתונים
    } catch (error) {
        console.error('Error fetching ratings:', error);
        return { totalRating: 0, countRating: 0 }; // במקרה של שגיאה, החזר ערכים ברירת מחדל
    }
}

