const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const PORT = 3000;

// MongoDB connection
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// SQLite Database Connection (for links and API JSON)
const db = new sqlite3.Database('./movieLinks.db', (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Mongoose Schemas and Models for MongoDB
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'USER'], default: 'USER' } // הוספת תפקיד
});


const favoriteSchema = new mongoose.Schema({
  email: { type: String, required: true },
  movieId: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);
const Favorite = mongoose.model('Favorite', favoriteSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('Client', { index: 'homepage.html' }));

// Routes

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/Client/homepage.html');
});

// MongoDB Registration endpoint
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send("Missing required fields.");
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).send("Email already exists.");
    }

    const newUser = new User({ username, email, password });
    await newUser.save();
    res.status(201).json({ message: "Registration successful!" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error registering user.");
  }
});

// MongoDB Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    console.log(`✅ User logged in: ${user.username}, Role: ${user.role}`); // הדפסת התפקיד בשרת

    res.status(200).json({
      success: true,
      user: {
        email: user.email,
        username: user.username,
        role: user.role // שליחת התפקיד ל-Frontend
      }
    });
  } catch (err) {
    console.error("❌ Error logging in:", err);
    res.status(500).json({ success: false, message: "Error logging in." });
  }
});




// MongoDB Logout endpoint
app.get('/logout', (req, res) => {
  res.clearCookie('userEmail');
  res.clearCookie('userUsername');
  res.redirect('/');
});

// MongoDB Fetch favorites for a user
app.get('/favorites/:email', async (req, res) => {
  const email = req.params.email;

  try {
    const favorites = await Favorite.find({ email }).select('movieId -_id');
    const movieIds = favorites.map(fav => fav.movieId);
    res.json(movieIds);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching favorites.");
  }
});

// MongoDB Add or remove a favorite movie
app.post('/update-favorite', async (req, res) => {
  const { email, movieId } = req.body;

  try {
    const existingFavorite = await Favorite.findOne({ email, movieId });

    if (existingFavorite) {
      await Favorite.deleteOne({ email, movieId });
      return res.json({ action: 'removed from', isFavorite: false });
    } else {
      await Favorite.create({ email, movieId });
      return res.json({ action: 'added to', isFavorite: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating favorites.");
  }
});


app.get('/get-links/:email/:imdbID', (req, res) => {
  const { email, imdbID } = req.params;
  const { page = 1 } = req.query;
  const limit = 3;
  const offset = (page - 1) * limit;

  console.log(`🔹 Fetching links for imdbID: ${imdbID}, email: ${email}, page: ${page}, limit: ${limit}`);

  db.all(`
      SELECT id, name, url, description, rating, email, 
             CASE WHEN email = ? THEN 1 ELSE 0 END AS isOwner 
      FROM links 
      WHERE imdbID = ? AND (email = ? OR isPublic = 1) 
      ORDER BY rating DESC
      LIMIT ? OFFSET ?`, 
      [email, imdbID, email, limit, offset],
      (err, rows) => {
          if (err) {
              console.error('❌ Error fetching links:', err.message);
              return res.status(500).json({ error: "Error fetching links." });
          }

          console.log(`✅ Links found:`, rows);

          db.get(`SELECT COUNT(*) as total FROM links WHERE imdbID = ? AND (email = ? OR isPublic = 1)`, 
          [imdbID, email], 
          (err, countResult) => {
              if (err) {
                  console.error('❌ Error counting links:', err.message);
                  return res.status(500).json({ error: "Error counting links." });
              }

              const totalPages = Math.ceil(countResult.total / limit);
              console.log(`📌 Total links: ${countResult.total}, Total pages: ${totalPages}`);

              res.json({
                  links: rows,
                  total: countResult.total,
                  page: Number(page),
                  totalPages
              });
          });
      }
  );
});




app.post('/update-rating', (req, res) => {
  const { imdbID, linkId, rating } = req.body;

  console.log('Received rating update request:', { imdbID, linkId, rating });

  if (!imdbID || !linkId || !rating) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // המרת הנתונים למספרים כדי למנוע שגיאות
  const ratingNum = parseFloat(rating);
  const linkIdNum = parseInt(linkId);

  console.log("Parameters being sent:", { ratingNum, linkIdNum, imdbID });

  // מבטיח שהפעולות יתבצעו בסדר הנכון
  db.serialize(() => {

    db.run('UPDATE links SET sumRates = COALESCE(sumRates, 0) + ? WHERE id = ? AND imdbID = ?',
      [ratingNum, linkIdNum, imdbID]
    )

    // עדכון מספר הדירוגים (countRates) - מוסיף 1
    db.run(
      'UPDATE links SET countRates = COALESCE(countRates, 0) + 1 WHERE id = ? AND imdbID = ?',
      [linkIdNum, imdbID],
      function (err) {
        if (err) {
          console.error('Error updating countRates:', err.message);
          return res.status(500).json({ error: "Error updating countRates." });
        }

        // אחרי עדכון countRates - עדכון הדירוג
        db.run(
          'UPDATE links SET rating = ( COALESCE(sumRates, 0)) * 1.0 / COALESCE(countRates, 1) WHERE id = ? AND imdbID = ?',
          [ linkIdNum, imdbID],
          function (err) {
            if (err) {
              console.error('Error updating rating:', err.message);
              return res.status(500).json({ error: "Error updating rating." });
            }

            // שולח תגובה רק אחרי שהעדכון השני הסתיים
            res.json({ success: true, message: 'Rating updated successfully.' });
          }
        );
      }
    );
  });
});





// SQLite Add a link for a specific movie and user
app.post('/add-link', (req, res) => {
  const { email, imdbID, name, url, description, isPublic } = req.body;

  if (!email || !imdbID || !name || !url || isPublic === undefined) {
    return res.status(400).json({ error: "All fields are required." });
  }

  db.run(
    'INSERT INTO links (email, imdbID, name, url, description, isPublic) VALUES (?, ?, ?, ?, ?, ?)',
    [email, imdbID, name, url, description, isPublic ? 1 : 0],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).send("Error adding link.");
      }
      res.json({ message: "Link added." });
    }
  );
});

// SQLite Delete link endpoint
app.post('/delete-link', (req, res) => {
  const { email, imdbID, linkId } = req.body;

  console.log('Received delete request:', { email, imdbID, linkId });

  db.get('SELECT * FROM links WHERE id = ? AND imdbID = ?', [linkId, imdbID], (err, row) => {
    if (err) {
      console.error('Error fetching link:', err.message);
      return res.status(500).send("Error fetching link.");
    }

    if (!row) {
      console.log('Link not found in database for linkId:', linkId);
      return res.status(404).json({ error: "Link not found." });
    }

    db.run('DELETE FROM links WHERE id = ?', [linkId], function (err) {
      if (err) {
        console.error('Error deleting link:', err.message);
        return res.status(500).send("Error deleting link.");
      }

      res.json({ message: "Link deleted." });
    });
  });
});

// SQLite Edit link endpoint
app.put('/edit-link/:linkId', (req, res) => {
  const { email, imdbID, name, url, description } = req.body;
  const linkId = req.params.linkId;

  db.get('SELECT * FROM links WHERE id = ? AND imdbID = ?', [linkId, imdbID], (err, row) => {
    if (err) {
      console.error('Error during fetch:', err.message);
      return res.status(500).json({ error: "Failed to fetch link." });
    }

    if (!row) {
      console.log('Link not found in database for linkId:', linkId);
      return res.status(404).json({ error: "Link not found." });
    }

    db.run('UPDATE links SET name = ?, url = ?, description = ? WHERE id = ?', [name, url, description, linkId], function (err) {
      if (err) {
        console.error('Error during update:', err.message);
        return res.status(500).json({ error: "Failed to update link." });
      }

      res.json({ message: "Link updated successfully" });
    });
  });
});

// SQLite Update link rating endpoint
app.post('/update-rating', (req, res) => {
  const {imdbID, linkId, rating } = req.body;
  
  console.log('Received rating update request:', { imdbID, linkId, rating });

  if (!imdbID || !linkId || !rating) {
    return res.status(400).json({ error: "All fields are required." });
  }

  db.run(
    'UPDATE links SET rating = ? WHERE id = ? AND imdbID = ?',
    [rating, linkId, imdbID],
    function (err) {
      if (err) {
        console.error('Error updating rating:', err.message);
        return res.status(500).send("Error updating rating.");
      }
      res.json({ success: true, message: 'Rating updated successfully.' });
    }
  );
});

app.get('/get-all-rating/:imdbID/:linkId', (req, res) => {
  const { imdbID, linkId } = req.params;
  console.log(linkId);
  console.log(imdbID);

  if (!imdbID?.trim() || !linkId?.trim()) {
    return res.status(400).json({ error: 'IMDBID and linkId are required and must be valid' });
  }

  console.log("*****************************88");


  db.get('SELECT SUM(rating) AS totalRating, COUNT(rating) AS countRating FROM links WHERE imdbID = imdbID AND id = id', [imdbID, linkId], (err, row) => {
    if (err) {
      console.error('Error fetching ratings:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    res.json({ 
      totalRating: row?.totalRating || 0, 
      countRating: row?.countRating || 0,
      message: row?.countRating ? undefined : 'No ratings found for this link'
    });
  });
  

});

app.post('/update-clicks/:linkId', (req, res) => {
  const { linkId } = req.params; // קבלת ה-ID מהנתיב

  // מבצע עדכון של מספר הקליקים
  db.run(
      'UPDATE links SET clicks = COALESCE(clicks, 0) + 1 WHERE id = ?',
      [linkId],
      function (err) {
          if (err) {
              console.error('Error updating clicks:', err.message);
              return res.status(500).send("Error updating clicks.");
          }

          if (this.changes === 0) {
              return res.status(404).json({ error: "Link not found." });
          }

      }
  );
});

app.get('/get-movies-with-top-links', (req, res) => {
  db.all(`
      SELECT imdbID, 
             url AS bestLink, 
             email, 
             clicks
      FROM links
      WHERE rating = (SELECT MAX(rating) FROM links AS sub WHERE sub.imdbID = links.imdbID)
      ORDER BY imdbID DESC`, 
  (err, rows) => {
      if (err) {
          console.error('Error fetching movies:', err.message);
          return res.status(500).json({ error: "Error fetching movies." });
      }
      res.json(rows);
  });
});



// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
