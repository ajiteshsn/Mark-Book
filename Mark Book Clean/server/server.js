import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const JWT_SECRET = 'markbook-secret-key-change-in-production';
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize data file if it doesn't exist
const initDataFile = () => {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [] }, null, 2));
    }
};

// Read data from file
const readData = () => {
    initDataFile();
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
};

// Write data to file
const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Register new user
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }

        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters' });
        }

        const data = readData();

        // Check if username already exists
        if (data.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            username,
            password: hashedPassword,
            courses: [],
            createdAt: new Date().toISOString()
        };

        data.users.push(newUser);
        writeData(data);

        // Generate token
        const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: { id: newUser.id, username: newUser.username }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const data = readData();
        const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate token
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username },
            courses: user.courses || []
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user data
app.get('/api/data', authenticateToken, (req, res) => {
    try {
        const data = readData();
        const user = data.users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ courses: user.courses || [] });
    } catch (error) {
        console.error('Get data error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Save user data
app.post('/api/data', authenticateToken, (req, res) => {
    try {
        const { courses } = req.body;
        const data = readData();
        const userIndex = data.users.findIndex(u => u.id === req.user.id);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        data.users[userIndex].courses = courses || [];
        data.users[userIndex].updatedAt = new Date().toISOString();
        writeData(data);

        res.json({ message: 'Data saved successfully' });
    } catch (error) {
        console.error('Save data error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    initDataFile();
    console.log(`Mark Book server running on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log('  POST /api/register - Create new account');
    console.log('  POST /api/login    - Login to account');
    console.log('  GET  /api/data     - Fetch saved courses');
    console.log('  POST /api/data     - Save courses');
});
