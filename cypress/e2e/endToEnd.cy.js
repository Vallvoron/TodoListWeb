import dayjs from 'dayjs';

describe('Task Manager – Полное покрытие', () => {
  const API_URL = 'http://localhost:8080/api/tasks';
  const WEB_URL = 'http://127.0.0.1:3000/Todo.html';

  //функция для создания базовой задачи (с вбиваемыми параметрами) для некоторых тестов
  function createTask(title = 'Default Task', options = {}) {
    cy.visit(WEB_URL);

    cy.get('#title').type(title);
    if (options.description) cy.get('#description').type(options.description);
    if (options.priority) cy.get('#priority').select(options.priority);
    if (options.status === 'COMPLETED') cy.get('#status').select('Completed');
    if (options.deadline) cy.get('#deadline').type(options.deadline);
    cy.get('#createTaskButton').click();

    cy.get('#taskList li', { timeout: 3000 }).should('exist');
  }

  beforeEach(() => {
    // Удаляем все задачи
    cy.request('GET', API_URL).then((res) => {
      res.body.forEach((task) => {
        cy.request('DELETE', `${API_URL}?id=${task.id}`);
      });
    });
  });

  it('01 - Нельзя создать задачу с 3 символами', () => {
    cy.visit(WEB_URL);
    cy.get('#title').type('abc');
    cy.get('#createTaskButton').click();
    cy.on('window:alert', (text) => {
      expect(text).to.include('Имя не может быть меньше 4 символов');
    });
  });

  it('02 - Создание задачи с минимально допустимым заголовком', () => {
    createTask('abcd');
    cy.get('#taskList').should('contain', 'abcd');
  });

  it('03 - Редактирование задачи: все поля', () => {//разделяю тесты чтобы проверять каждый пункт листа отдельно (во всех тестах)
    createTask('edit me');

    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    cy.get('.edit-button').click();
    cy.get('#editTitle').clear().type('Updated Title');
    cy.get('#editDescription').clear().type('Updated Desc');
    cy.get('#editPriority').select('HIGH');
    cy.get('#editDeadline').clear().type(tomorrow);
    cy.get('#editStatus').uncheck();
    cy.contains('Save').click();

    cy.get('#taskList').should('contain', 'Updated Title');
    cy.get('#taskList').should('contain', 'HIGH');
  });

  it('04 - Задача с дедлайном < 3 дней - оранжевый цвет', () => {
    const soon = dayjs().add(2, 'day').format('YYYY-MM-DD');
    createTask('Deadline Soon', { deadline: soon });

    cy.get('#taskList li').should('have.css', 'background-color', 'rgb(255, 165, 0)');
  });

  it('05 - Статус задачи после создания: ACTIVE', () => {
    createTask('Just Created');
    cy.get('#taskList').should('contain', 'Status: ACTIVE');
  });

  it('06 - Дедлайн в прошлом без завершения делает задачу OVERDUE', () => {
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    createTask('Overdue Test');

    cy.get('.edit-button').click();
    cy.get('#editDeadline').clear().type(yesterday);
    cy.get('#editStatus').uncheck();
    cy.contains('Save').click();

    cy.get('#taskList').should('contain', 'Status: OVERDUE');//да, дэдлайн может быть отредактирован до прошлого, это для проверки
  });

  it('07 - Цвет просроченной задачи: красный', () => {
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    createTask('Red Task');

    cy.get('.edit-button').click();
    cy.get('#editDeadline').clear().type(yesterday);
    cy.get('#editStatus').uncheck();
    cy.contains('Save').click();

    cy.get('#taskList li').should('have.css', 'background-color', 'rgb(255, 0, 0)');
  });

  it('08 - Завершенная задачи: статус становится LATE, если дедлайн прошёл', () => {
    const futureDate = dayjs().add(2, 'day').format('YYYY-MM-DD');
    const pastDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    createTask('Late Candidate', { deadline: futureDate });
    //переводим дэдлайн на вчера
    cy.get('.edit-button').click();
    cy.get('#editDeadline').clear().type(pastDate);
    cy.get('#editStatus').check();
    cy.contains('Save').click();

    cy.get('#taskList').should('contain', 'Status: LATE');
  });

  it('09 - Отмечаем выполненную просроченную задачу как невыполненную → статус становится OVERDUE', () => {
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    cy.visit(WEB_URL);
    cy.get('#title').type('Test Task !2');
    cy.get('#description').type('Overdue after unchecking');
    cy.get('#deadline').type(tomorrow);
    cy.get('#createTaskButton').click();

    cy.get('.edit-button').click();
    cy.get('#editDeadline').clear().type(dayjs().subtract(1, 'day').format('YYYY-MM-DD'));
    cy.get('#editStatus').check();
    cy.contains('Save').click();
    cy.get('#taskList').should('contain', 'Status: LATE');

    //как 8 пункт только анчекаем обратно
    cy.get('.edit-button').click();
    cy.get('#editStatus').uncheck();
    cy.contains('Save').click();

    cy.get('#taskList').should('contain', 'Status: OVERDUE');
  });

  it('10 - Макрос "!1" присваивает CRITICAL приоритет', () => {
    createTask('Macro !1');
    cy.get('#taskList').should('contain', 'Priority: CRITICAL');
    cy.get('#taskList').should('contain', 'Macro');
  });

  it('11 - Макрос "!before 16-12-2025" задаёт дедлайн', () => {
    createTask('Deadline !before 16-12-2025');
    cy.get('#taskList').should('contain', 'Deadline: 16.12.2025');
  });

  it('12 - Макросы !before и !1 работают одновременно', () => {
    createTask('Full !1 !before 20-12-2025');
    cy.get('#taskList').should('contain', 'Priority: CRITICAL');
    cy.get('#taskList').should('contain', 'Deadline: 20.12.2025');
  });

  it('13 - Явно заданные дедлайн и приоритет переопределяют макросы', () => {
    createTask('Override !1 !before 01-01-2030', {
      priority: 'LOW',
      deadline: '2029-12-31'
    });
    cy.get('#taskList').should('contain', 'Priority: LOW');
    cy.get('#taskList').should('contain', 'Deadline: 31.12.2029');
  });

  //Интересно, почему то при выполнении кода на глазах поля сортировки меняются а когда пытаешься посмотреть по шагам-нет...
  it('14 - Проверка сортировки и дефолтного цвета завершённых задач с будущим дедлайном', () => {
    const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
    const nextWeek = dayjs().add(7, 'days').format('YYYY-MM-DD');

    cy.visit(WEB_URL);

    //тут уже нужны 2 разные задачи с разными именами, статусами, приоритетами, дэдлайнами и т.д.

    //первая
    cy.get('#title').type('Later Task');
    cy.get('#description').type('Deadline later');
    cy.get('#deadline').type(endOfMonth);
    cy.get('#status').select('COMPLETED');
    cy.get('#priority').select('LOW');
    cy.get('#createTaskButton').click();

    //вторая
    cy.get('#title').clear().type('Sooner Task');
    cy.get('#description').type('Deadline sooner');
    cy.get('#deadline').type(nextWeek);
    cy.get('#status').select('COMPLETED');
    cy.get('#priority').select('CRITICAL');
    cy.get('#createTaskButton').click();

    // Сортировка по дедлайну по возрастанию
    cy.get('#sortBy').select('deadline');
    cy.get('#sortDirection').select('Ascending');
    cy.get('#loadTasksButton').click();

    cy.get('#taskList li').eq(0).should('contain', 'Sooner Task');
    cy.get('#taskList li').eq(1).should('contain', 'Later Task');

    // Сортировка по дедлайну по убыванию
    cy.get('#sortDirection').select('Descending');
    cy.get('#loadTasksButton').click();

    cy.get('#taskList li').eq(0).should('contain', 'Later Task');
    cy.get('#taskList li').eq(1).should('contain', 'Sooner Task');

    // Проверка сортировки по названию по возрастанию
    cy.get('#sortBy').select('Title');
    cy.get('#sortDirection').select('Ascending');
    cy.get('#loadTasksButton').click();
    cy.get('#taskList li').eq(0).should('contain', 'Later Task');
    cy.get('#taskList li').eq(1).should('contain', 'Sooner Task');

    // Проверка сортировки по приоритету по убыванию
    cy.get('#sortBy').select('Priority');
    cy.get('#sortDirection').select('Descending');
    cy.get('#loadTasksButton').click();
    cy.get('#taskList li').eq(0).should('contain', 'Later Task'); //да, сортировка везде по алфавиту....
    cy.get('#taskList li').eq(1).should('contain', 'Sooner Task');
  });

  it('15 - Удаление задачи', () => {
    createTask('To Be Deleted');
    cy.get('.delete-button').click();
    cy.get('#taskList').should('not.contain', 'To Be Deleted');
  });
});