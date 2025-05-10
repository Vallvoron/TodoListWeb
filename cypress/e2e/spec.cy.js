describe('Task Manager', () => {
  const API_URL ='http://127.0.0.1:3000/Todo.html';//'http://localhost:8080/api/tasks';
  const WEB_URL = 'http://127.0.0.1:3000/Todo.html';

  // Clean up tasks before each test
 beforeEach(() => {
  // Clear all tasks before each test
  cy.intercept('GET', WEB_URL).as('getTasks');
  cy.intercept('DELETE', `${API_URL}?id=*`).as('deleteTask');
  cy.intercept('POST', API_URL).as('createTask');
  cy.intercept('PUT', `${API_URL}?id=*`).as('editTask');

  // Make sure the GET request fetches tasks successfully before the test starts
  cy.request('GET', API_URL).then((response) => {
    if (Array.isArray(response.body)) {
      // If tasks are available, delete them
      response.body.forEach((task) => {
        cy.request('DELETE', `${API_URL}?id=${task.id}`);
      });
    } else {
      cy.log('No tasks found or the response body is not an array.');
    }
  });
});

  // 1. Create Task
  it('should create a task with title, description, deadline, and priority', () => {
    cy.visit(WEB_URL);

    cy.get('#title').type('Test Task !2');
    cy.get('#description').type('This is a test task.');
    cy.get('#status').select('ACTIVE');
    cy.get('#priority').select('null'); // priority should be overridden by the title macro
    cy.get('#deadline').type('2025-12-31');
    cy.get('#createTaskButton').click();

    // Check that the task list contains the created task
    cy.get('#taskList').children()
      .should('contain', 'Test Task')
      .and('contain', 'Priority: HIGH')
      .and('contain', 'Deadline: 31.12.2025');
  });

  // 2. Display Task List with Sorting
  it('should display tasks sorted by deadline', () => {
    cy.visit(WEB_URL);
    
    // Wait for GET request to fetch tasks
    cy.wait('@getTasks').then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
    });
    
    cy.get('#sortBy').select('deadline');
    cy.get('#sortDirection').select('ASC');
    cy.get('#loadTasksButton').click();

    // Ensure the task list is loaded and contains the tasks
    cy.get('#taskList').children().last().should('contain', 'Test Task');
  });

  // 3. Edit Task
  it('should edit an existing task', () => {
    cy.visit(WEB_URL);
    
    cy.get('.edit-button').first().click();

    cy.get('input[id="editTitle"]').clear().type('Updated Task');
    cy.get('textarea[id="editDescription"]').clear().type('Updated task description.');
    cy.get('input[id="editDeadline"]').clear().type('2025-12-25');
    cy.get('select[id="editPriority"]').select('LOW');
    cy.get('button').contains('Save').click();

    // Check the updated task in the task list
    cy.get('#taskList')
      .should('contain', 'Updated Task')
      .and('contain', 'Priority: LOW')
      .and('contain', 'Deadline: 25.12.2025');
  });

  // 4. Delete Task
  it('should delete a task', () => {
    cy.visit(WEB_URL);
    cy.get('.delete-button').first().click();

    // Ensure the task is no longer in the task list
    cy.get('#taskList').should('not.contain', 'Updated Task');
  });

  // 5. Mark Task as Completed
  it('should mark a task as completed', () => {
    cy.visit(WEB_URL);
    cy.wait(5000);
    cy.get('.edit-button').first().click();

    cy.get('input[name="status"]').check(); // mark as completed
    cy.get('button').contains('Save').click();

    // Ensure the task is marked as completed
    cy.get('#taskList')
      .should('contain', 'Status: COMPLETED')
      .and('not.contain', 'Active');
  });

  // 6. Automatic Priority Assignment
  it('should automatically assign priority from title macro', () => {
    cy.visit(WEB_URL);
    cy.get('#title').type('Important Task !1');
    cy.get('#description').type('This task has critical priority');
    cy.get('#priority').select('null'); // priority will be set from title macro
    cy.get('#createTaskButton').click();

    // Check that the task list contains the created task with correct priority
    cy.get('#taskList')
      .should('contain', 'Important Task')
      .and('contain', 'Priority: CRITICAL');
  });

  // 7. Automatic Deadline Assignment
  it('should automatically assign deadline from title macro', () => {
    cy.visit(WEB_URL);
    cy.get('#title').type('Task with deadline !before 16-12-2025');
    cy.get('#description').type('This task has a deadline based on the title macro');
    cy.get('#createTaskButton').click();

    // Check that the task list contains the created task with correct deadline
    cy.get('#taskList')
      .should('contain', 'Task with deadline')
      .and('contain', 'Deadline: 16.12.2025');
  });

  // 8. Highlight Tasks by Deadline
  it('should highlight tasks with approaching or overdue deadlines', () => {
    // Create an overdue task
    cy.visit(WEB_URL);
    cy.get('#title').type('Overdue Task !2');
    cy.get('#description').type('This task is overdue.');
    cy.get('#deadline').type('2025-01-01');
    cy.get('#createTaskButton').click();

    // Create a task with a deadline in less than 3 days
    cy.get('#title').type('Upcoming Task !3');
    cy.get('#description').type('This task is coming soon.');
    cy.get('#deadline').type('2025-05-11');
    cy.get('#createTaskButton').click();
    
    cy.get('#taskList')
      .children()
      .last().should('have.css', 'background-color', 'rgb(255, 165, 0)'); // Orange for upcoming deadline
  });
});