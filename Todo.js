const API_URL = 'http://localhost:8080/api/tasks';

loadTasks();
document.getElementById('createTaskButton').addEventListener('click', createTask);
document.getElementById('loadTasksButton').addEventListener('click', loadTasks);
async function loadTasks() {
    const sortBy = document.getElementById('sortBy').value;
    const sortDirection = document.getElementById('sortDirection').value;

    const url = `${API_URL}?sortBy=${sortBy}&sortDirection=${sortDirection}`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        });;
        const tasks = await response.json();
        displayTasks(tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        displayError('Failed to load tasks.');
    }
}

async function createTask(event) {
    event.preventDefault();

    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const status = document.getElementById('status').value;
    var priority = document.getElementById('priority').value;
    var deadline = document.getElementById('deadline').value;
    if(priority=="null"){
        priority = null;
    }

    const task = {
        title: title,
        description: description,
        status: status,
        priority: priority,
        deadline: deadline
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(task)
        });
        if (response.ok) {
            loadTasks();
        } else {
            const errorData = await response.json();
            const errorMessage = errorData.message || 'Failed to create task.';
            alert(errorMessage);
            return;
        }
    } catch (error) {
        alert('Failed to create task:', error.message);
    }
}

function displayTasks(tasks) {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = '';

    tasks.forEach(task => {
        const deadline = task.deadline ? new Date(task.deadline) : null;
        const now = new Date();
        const timeLeft = deadline ? deadline.getTime() - now.getTime() : 0;
        const daysLeft = Math.ceil(timeLeft / (1000 * 3600 * 24));

        let taskStyle = '';
        if (deadline && task.status !== 'COMPLETED') {
            if (daysLeft < 0) {
                taskStyle = 'background-color: red;';
            } else if (daysLeft < 3) {
                taskStyle = 'background-color: orange;';
            }
        }

        const li = document.createElement('li');
        li.style = taskStyle;

        li.innerHTML = `
            <h3>${task.title}</h3>
            <p>${task.description}</p>
            <p>Priority: ${task.priority}</p>
            ${deadline ? `<p>Deadline: ${deadline.toLocaleDateString()}</p>` : ''}
            <p>Status: ${task.status}</p>
            <p>Created at: ${task.createdAt}</p>
            <p>Updated at: ${task.updatedAt}</p>
            <button data-task-id="${task.id}" class="edit-button">Edit</button>
            <button onclick="deleteTask('${task.id}')">Delete</button>
        `;
        taskList.appendChild(li);
    });

    const editButtons = document.querySelectorAll('.edit-button');
    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const taskId = button.dataset.taskId;
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                showForm(task);
            } else {
                console.error('Task not found for id:', taskId);
            }
        });
    });
}


function displayError(message) {
    alert(message);
}

async function deleteTask(id) {
    try {
        const response = await fetch(`${API_URL}?id=${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            loadTasks();
        } else {
            displayError('Failed to delete task.');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        displayError('Failed to delete task.');
    }
}

async function editTask(id, task){
    try {
        const response = await fetch(`${API_URL}?id=${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(task)
        });
        if (response.ok) {
            loadTasks();
        } else {
            const errorData = await response.json();
            const errorMessage = errorData.message || 'Failed to create task.';
            alert(errorMessage);
            return;
        }
    } catch (error) {
        console.error('Error editing task:', error);
        displayError('Failed to edit task.');
    }
}

function showForm(task) {
    const taskList = document.getElementById('taskList');
    const taskElement = Array.from(taskList.children).find(li => li.querySelector('.edit-button')?.dataset.taskId === task.id);


    if (taskElement) {

        const editForm = document.createElement('form');

        const titleLabel = document.createElement('label');
        titleLabel.textContent = 'Title:';
        editForm.appendChild(titleLabel);

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.name = 'title';
        titleInput.value = task.title;
        titleInput.required = true;
        editForm.appendChild(titleInput);
        editForm.appendChild(document.createElement('br'));
        editForm.appendChild(document.createElement('br'));

        const descriptionLabel = document.createElement('label');
        descriptionLabel.textContent = 'Description:';
        editForm.appendChild(descriptionLabel);

        const descriptionTextarea = document.createElement('textarea');
        descriptionTextarea.name = 'description';
        descriptionTextarea.textContent = task.description;
        editForm.appendChild(descriptionTextarea);
        editForm.appendChild(document.createElement('br'));
        editForm.appendChild(document.createElement('br'));


        const statusLabel = document.createElement('label');
        statusLabel.textContent = 'Completed:'; 
        editForm.appendChild(statusLabel);
        const statusCheckbox = document.createElement('input');
        statusCheckbox.type = 'checkbox';
        statusCheckbox.name = 'status';
        statusCheckbox.checked = task.status === 'COMPLETED';
        editForm.appendChild(statusCheckbox);
        editForm.appendChild(document.createElement('br'));
        editForm.appendChild(document.createElement('br'));


        const priorityLabel = document.createElement('label');
        priorityLabel.textContent = 'Priority:';
        editForm.appendChild(priorityLabel);

        const prioritySelect = document.createElement('select');
        prioritySelect.name = 'priority';

        const priorityOptions = [null, "CRITICAL", "HIGH", "MEDIUM", "LOW"];
        priorityOptions.forEach(priorityValue => {
            const option = document.createElement('option');
            option.value = priorityValue;
            option.textContent = priorityValue === null ? "null" : priorityValue;
            if (task.priority === priorityValue) {
                option.selected = true;
            }
            prioritySelect.appendChild(option);
        });

        editForm.appendChild(prioritySelect);
        editForm.appendChild(document.createElement('br'));
        editForm.appendChild(document.createElement('br'));


        const deadlineLabel = document.createElement('label');
        deadlineLabel.textContent = 'Deadline:';
        editForm.appendChild(deadlineLabel);

        const deadlineInput = document.createElement('input');
        deadlineInput.type = 'date';
        deadlineInput.name = 'deadline';
        deadlineInput.value = task.deadline ? task.deadline.split('T')[0] : ''; 

        editForm.appendChild(deadlineInput);
        editForm.appendChild(document.createElement('br'));
        editForm.appendChild(document.createElement('br'));


        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Save';
        saveButton.addEventListener('click', () => {
            var pr;
            if(editForm.priority.value=="null"){
                pr=null;
            } else pr=editForm.priority.value;
            const updatedTaskData = {
                title: editForm.title.value,
                description: editForm.description.value,
                status: editForm.status.checked ? 'COMPLETED' : 'ACTIVE',
                priority: pr,
                deadline: editForm.deadline.value
            };
            editTask(task.id, updatedTaskData);
        });
        editForm.appendChild(saveButton);

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => loadTasks());
        editForm.appendChild(cancelButton);

        taskElement.innerHTML = '';
        taskElement.appendChild(editForm);
    }
}