const sqlite3 = require('sqlite3').verbose();

// יצירת/פתיחת מסד הנתונים SQLite
const db = new sqlite3.Database('./movieLinks.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// יצירת טבלה ללינקים אם היא לא קיימת
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            imdbID TEXT,
            name TEXT,
            url TEXT,
            description TEXT,
            email TEXT,
            isPublic INTEGER,
            rating REAL,
            countRates INTEGER,
            sumRates INTEGER,
            clicks INTEGER
        )
    `);
});

module.exports = db;
