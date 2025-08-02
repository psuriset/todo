const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

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

// API routes
app.get('/api/tasks', (req, res) => {
    res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
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

app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;
    const task = tasks.find(t => t.id === parseInt(id));
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    task.completed = completed;
    res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
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
