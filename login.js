// Import required modules
import 'dotenv/config';
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const validator = require('validator'); // Optional for email validation

const app = express();
app.use(cors());
app.use(express.json()); // Parse incoming JSON data

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'careconnect-db.chskwweauaoi.ap-south-1.rds.amazonaws.com',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'Careconnect',
    database: process.env.DB_NAME || 'careconnect'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Secret key for JWT
const jwtSecret = 'c0a928a4f1b1b8c4df9c0ab918b827b3a7f04d3642a3f6f7c2d9c88f3e4a9dbd'; // Make sure to use a strong secret key

// User Registration Route
app.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ error: 'Please provide a username, password, and email' });
    }

    // Validate email format (optional)
    if (!validator.isEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user already exists
    db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (results.length > 0) {
            return res.status(400).json({ error: 'User with this username or email already exists' });
        }

        // Hash the password
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) return res.status(500).json({ error: 'Error hashing password' });

            // Insert user into database
            db.query(
                'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
                [username, hashedPassword, email],
                (err, results) => {
                    if (err) return res.status(500).json({ error: 'Error registering user' });

                    return res.status(201).json({ message: 'User registered successfully' });
                }
            );
        });
    });
});

// User Login Route
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide an email and password' });
    }

    // Check if user exists by email only
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (results.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Compare the provided password with the hashed password
        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return res.status(500).json({ error: 'Error comparing passwords' });

            if (!isMatch) {
                return res.status(400).json({ error: 'Invalid credentials' });
            }

            // Generate JWT token
            const token = jwt.sign({ userId: user.id, email: user.email }, jwtSecret, {
                expiresIn: '1h',
            });

            return res.json({ message: 'Login successful', token });
        });
    });
});

// Start the server
app.listen(5000, () => {
    console.log('Server is running on http://localhost:5000');
});
