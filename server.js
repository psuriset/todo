require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const AppleStrategy = require('passport-apple').Strategy;

const app = express();
const PORT = process.env.PORT || 3000;

// Session middleware
app.use(session({
    secret: 'your-secret-key', // Replace with a strong secret
    resave: false,
    saveUninitialized: false,
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// User store (in-memory for this example)
const users = {};
let nextUserId = 1;

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    const user = users[id];
    done(null, user);
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID, // Replace with your Google Client ID
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Replace with your Google Client Secret
    callbackURL: '/auth/google/callback',
}, (accessToken, refreshToken, profile, done) => {
    let user = Object.values(users).find(u => u.providerId === profile.id && u.provider === 'google');

    if (!user) {
        user = {
            id: nextUserId++,
            providerId: profile.id,
            displayName: profile.displayName,
            provider: 'google',
            role: Object.keys(users).length === 0 ? 'admin' : 'user', // First user is admin
        };
        users[user.id] = user;
    }

    return done(null, user);
}));

// Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID, // Replace with your Facebook App ID
    clientSecret: process.env.FACEBOOK_APP_SECRET, // Replace with your Facebook App Secret
    callbackURL: '/auth/facebook/callback',
}, (accessToken, refreshToken, profile, done) => {
    let user = Object.values(users).find(u => u.providerId === profile.id && u.provider === 'facebook');

    if (!user) {
        user = {
            id: nextUserId++,
            providerId: profile.id,
            displayName: profile.displayName,
            provider: 'facebook',
            role: Object.keys(users).length === 0 ? 'admin' : 'user',
        };
        users[user.id] = user;
    }
    return done(null, user);
}));

// Apple Strategy
passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID, // Your Apple Service ID
    teamID: process.env.APPLE_TEAM_ID, // Your Apple Team ID
    keyID: process.env.APPLE_KEY_ID, // Your Apple Key ID
    privateKeyLocation: path.join(__dirname, process.env.APPLE_PRIVATE_KEY_FILE), // Path to your .p8 key file
    callbackURL: '/auth/apple/callback',
}, (accessToken, refreshToken, profile, done) => {
    let user = Object.values(users).find(u => u.providerId === profile.id && u.provider === 'apple');

    if (!user) {
        user = {
            id: nextUserId++,
            providerId: profile.id,
            displayName: `${profile.name.firstName} ${profile.name.lastName}`,
            provider: 'apple',
            role: Object.keys(users).length === 0 ? 'admin' : 'user',
        };
        users[user.id] = user;
    }
    return done(null, user);
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store
let tasks = [
    { id: 1, text: 'Submit performance review', type: 'official', period: 'daily', completed: false, owner: 1 },
    { id: 2, text: 'Buy groceries', type: 'personal', period: 'weekly', completed: true, owner: 1 },
    { id: 3, text: 'Schedule team meeting', type: 'official', period: 'daily', completed: false, owner: 2 },
    { id: 4, text: 'Plan weekend trip', type: 'personal', period: 'weekly', completed: false, owner: 2 },
];
let nextId = 5;

// Middleware to protect routes
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};

// RBAC Middleware
const ensureAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    res.status(403).json({ error: 'Forbidden' });
};

// Authentication routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/');
});

app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/');
});

app.get('/auth/apple', passport.authenticate('apple'));
app.get('/auth/apple/callback', passport.authenticate('apple', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/');
});

// Logout route
app.get('/auth/logout', (req, res) => {
    req.logout(err => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.redirect('/');
    });
});

// API to get user info
app.get('/api/user', (req, res) => {
    res.json(req.user || null);
});

// API routes
app.get('/api/tasks', ensureAuthenticated, (req, res) => {
    if (req.user.role === 'admin') {
        res.json(tasks); // Admins see all tasks
    } else {
        res.json(tasks.filter(t => t.owner === req.user.id)); // Users see only their tasks
    }
});

app.post('/api/tasks', ensureAuthenticated, (req, res) => {
    const { text, type, period } = req.body;
    if (!text || !type || !period) {
        return res.status(400).json({ error: 'Text, type, and period are required' });
    }
    const newTask = {
        id: nextId++,
        text,
        type,
        period,
        completed: false,
        owner: req.user.id,
    };
    tasks.push(newTask);
    res.status(201).json(newTask);
});

app.put('/api/tasks/:id', ensureAuthenticated, (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;
    const task = tasks.find(t => t.id === parseInt(id));
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    if (task.owner !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    task.completed = completed;
    res.json(task);
});

app.delete('/api/tasks/:id', ensureAuthenticated, (req, res) => {
    const { id } = req.params;
    const task = tasks.find(t => t.id === parseInt(id));
    if (!task) {
        // To prevent leaking information, we don't tell the user if the task
        // ever existed. We just say it was successful.
        return res.status(204).send();
    }
    if (task.owner !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    tasks = tasks.filter(t => t.id !== parseInt(id));
    res.status(204).send();
});

// Admin route to view all users
app.get('/api/users', ensureAuthenticated, ensureAdmin, (req, res) => {
    res.json(Object.values(users));
});

// Serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
