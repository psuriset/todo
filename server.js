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
    const user = {
        id: profile.id,
        displayName: profile.displayName,
        provider: 'google',
    };
    users[user.id] = user;
    return done(null, user);
}));

// Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: 'YOUR_FACEBOOK_APP_ID', // Replace with your Facebook App ID
    clientSecret: 'YOUR_FACEBOOK_APP_SECRET', // Replace with your Facebook App Secret
    callbackURL: '/auth/facebook/callback',
}, (accessToken, refreshToken, profile, done) => {
    const user = {
        id: profile.id,
        displayName: profile.displayName,
        provider: 'facebook',
    };
    users[user.id] = user;
    return done(null, user);
}));

// Apple Strategy
passport.use(new AppleStrategy({
    clientID: 'YOUR_APPLE_CLIENT_ID', // Replace with your Apple Client ID
    teamID: 'YOUR_APPLE_TEAM_ID', // Replace with your Apple Team ID
    keyID: 'YOUR_APPLE_KEY_ID', // Replace with your Apple Key ID
    privateKeyLocation: path.join(__dirname, 'AuthKey.p8'), // Path to your .p8 key file
    callbackURL: '/auth/apple/callback',
}, (accessToken, refreshToken, profile, done) => {
    const user = {
        id: profile.id,
        displayName: `${profile.name.firstName} ${profile.name.lastName}`,
        provider: 'apple',
    };
    users[user.id] = user;
    return done(null, user);
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store
let tasks = [
    { id: 1, text: 'Submit performance review', type: 'official', period: 'daily', completed: false },
    { id: 2, text: 'Buy groceries', type: 'personal', period: 'weekly', completed: true },
    { id: 3, text: 'Schedule team meeting', type: 'official', period: 'daily', completed: false },
    { id: 4, text: 'Plan weekend trip', type: 'personal', period: 'weekly', completed: false },
];
let nextId = 5;

// Middleware to protect routes
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
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
    res.json(tasks);
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
    task.completed = completed;
    res.json(task);
});

app.delete('/api/tasks/:id', ensureAuthenticated, (req, res) => {
    const { id } = req.params;
    tasks = tasks.filter(t => t.id !== parseInt(id));
    res.status(204).send();
});

// Serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
