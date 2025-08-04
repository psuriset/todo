document.addEventListener('DOMContentLoaded', async () => {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    const userProfile = document.getElementById('user-profile');

    const newTaskInput = document.getElementById('new-task');
    const taskTypeSelect = document.getElementById('task-type');
    const taskPeriodSelect = document.getElementById('task-period');
    const addTaskBtn = document.getElementById('add-task-btn');
    const personalTasksList = document.getElementById('personal-tasks');
    const officialTasksList = document.getElementById('official-tasks');
    const dailyViewBtn = document.getElementById('daily-view-btn');
    const weeklyViewBtn = document.getElementById('weekly-view-btn');
    const personalTitle = document.getElementById('personal-title');
    const officialTitle = document.getElementById('official-title');

    const API_URL = '/api/tasks';
    let allTasks = [];
    let currentPeriod = 'daily';
    let user = null;

    // Check user authentication status
    const checkAuth = async () => {
        try {
            const response = await fetch('/api/user');
            user = await response.json();

            if (user) {
                authSection.style.display = 'none';
                appSection.style.display = 'block';
                renderUserProfile();
                fetchTasks();
            } else {
                authSection.style.display = 'block';
                appSection.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking auth:', error);
            authSection.style.display = 'block';
            appSection.style.display = 'none';
        }
    };

    const renderUserProfile = () => {
        if (!user) return;
        userProfile.innerHTML = `
            <span>Welcome, ${user.displayName}!</span>
            <a href="/auth/logout" id="logout-btn">Logout</a>
        `;
    };

    // Fetch and render tasks
    const fetchTasks = async () => {
        if (!user) return;
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                if (response.status === 401) {
                    // Not authorized, likely session expired
                    window.location.href = '/';
                }
                throw new Error('Failed to fetch tasks');
            }
            allTasks = await response.json();
            renderTasks();
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    // Render tasks based on the current view
    const renderTasks = () => {
        personalTasksList.innerHTML = '';
        officialTasksList.innerHTML = '';

        const capitalizedPeriod = currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1);
        personalTitle.textContent = `Personal (${capitalizedPeriod})`;
        officialTitle.textContent = `Official (${capitalizedPeriod})`;

        const filteredTasks = allTasks.filter(task => task.period === currentPeriod);

        filteredTasks.forEach(task => {
            const list = task.type === 'personal' ? personalTasksList : officialTasksList;
            const taskElement = createTaskElement(task);
            list.appendChild(taskElement);
        });
    };

    // Create a new task element
    const createTaskElement = (task) => {
        const li = document.createElement('li');
        li.dataset.id = task.id;
        if (task.completed) {
            li.classList.add('completed');
        }

        const taskText = document.createElement('span');
        taskText.textContent = task.text;

        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('actions');

        const completeBtn = document.createElement('button');
        completeBtn.textContent = '✓';
        completeBtn.addEventListener('click', () => toggleComplete(task.id, !task.completed));

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✗';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));

        actionsDiv.appendChild(completeBtn);
        actionsDiv.appendChild(deleteBtn);
        li.appendChild(taskText);
        li.appendChild(actionsDiv);

        return li;
    };

    // Add a new task
    const addTask = async () => {
        const text = newTaskInput.value.trim();
        const type = taskTypeSelect.value;
        const period = taskPeriodSelect.value;
        if (text === '') return;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, type, period }),
            });
            const newTask = await response.json();
            allTasks.push(newTask);
            renderTasks();
            newTaskInput.value = '';
        } catch (error) {
            console.error('Error adding task:', error);
        }
    };

    // Toggle task completion
    const toggleComplete = async (id, completed) => {
        try {
            await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed }),
            });
            const task = allTasks.find(t => t.id === id);
            if (task) {
                task.completed = completed;
            }
            renderTasks();
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    // Delete a task
    const deleteTask = async (id) => {
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            allTasks = allTasks.filter(t => t.id !== id);
            renderTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    // Switch between daily and weekly views
    const setView = (period) => {
        currentPeriod = period;
        if (period === 'daily') {
            dailyViewBtn.classList.add('active');
            weeklyViewBtn.classList.remove('active');
        } else {
            weeklyViewBtn.classList.add('active');
            dailyViewBtn.classList.remove('active');
        }
        renderTasks();
    };

    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    dailyViewBtn.addEventListener('click', () => setView('daily'));
    weeklyViewBtn.addEventListener('click', () => setView('weekly'));

    // Initial load
    checkAuth();
});
