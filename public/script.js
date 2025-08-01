document.addEventListener('DOMContentLoaded', () => {
    const newTaskInput = document.getElementById('new-task');
    const taskTypeSelect = document.getElementById('task-type');
    const addTaskBtn = document.getElementById('add-task-btn');
    const personalTasksList = document.getElementById('personal-tasks');
    const officialTasksList = document.getElementById('official-tasks');

    const API_URL = '/api/tasks';

    // Fetch and render tasks on page load
    const fetchTasks = async () => {
        try {
            const response = await fetch(API_URL);
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    // Render tasks to the appropriate lists
    const renderTasks = (tasks) => {
        personalTasksList.innerHTML = '';
        officialTasksList.innerHTML = '';
        tasks.forEach(task => {
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
        if (text === '') return;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, type }),
            });
            const newTask = await response.json();
            const list = newTask.type === 'personal' ? personalTasksList : officialTasksList;
            list.appendChild(createTaskElement(newTask));
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
            fetchTasks(); // Re-fetch to update UI
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    // Delete a task
    const deleteTask = async (id) => {
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            fetchTasks(); // Re-fetch to update UI
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    fetchTasks();
});
