let todos = [];
let currentFilter = 'all';

function loadTodos() {
    const storedTodos = localStorage.getItem('todos');
    if (storedTodos) {
        todos = JSON.parse(storedTodos);
    }
    renderTodos();
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function isOverdue(todo) {
    if (!todo.dueDate || todo.completed) return false;
    return new Date(todo.dueDate) < new Date();
}

function addTodo() {
    const input = document.getElementById('todoInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const dueDateInput = document.getElementById('dueDateInput');
    const text = input.value.trim();
    
    if (text === '') {
        alert('Пожалуйста, введите текст задачи!');
        return;
    }
    
    const newTodo = {
        id: Date.now(),
        text: text,
        completed: false,
        priority: prioritySelect.value,
        createdAt: new Date().toISOString(),
        dueDate: dueDateInput.value || null
    };
    
    todos.push(newTodo);
    saveTodos();
    renderTodos();
    
    input.value = '';
    dueDateInput.value = '';
    input.focus();
}

function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    renderTodos();
}

function toggleTodo(id) {
    const todo = todos.find(todo => todo.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
    }
}

function editTodo(id) {
    const todo = todos.find(todo => todo.id === id);
    if (!todo) return;
    
    const newText = prompt('Редактировать задачу:', todo.text);
    if (newText !== null && newText.trim() !== '') {
        todo.text = newText.trim();
        saveTodos();
        renderTodos();
    }
}

function clearAllTodos() {
    if (todos.length === 0) return;
    if (confirm('Вы уверены, что хотите удалить все задачи?')) {
        todos = [];
        saveTodos();
        renderTodos();
    }
}

function setFilter(filter) {
    currentFilter = filter;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    renderTodos();
}

function getFilteredTodos() {
    if (currentFilter === 'active') {
        return todos.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        return todos.filter(todo => todo.completed);
    }
    return todos;
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const button = document.getElementById('themeToggle');
    button.textContent = document.body.classList.contains('dark-theme') ? '☀️ Светлая тема' : '🌙 Тёмная тема';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    const filteredTodos = getFilteredTodos();
    const activeCount = todos.filter(todo => !todo.completed).length;
    
    document.getElementById('taskCount').textContent = activeCount;
    
    if (filteredTodos.length === 0) {
        todoList.innerHTML = '<div class="todo-item" style="justify-content: center; color: #999;">Нет задач</div>';
        return;
    }
    
    todoList.innerHTML = filteredTodos.map(todo => {
        const dueDateHtml = todo.dueDate 
            ? `<span class="todo-due ${isOverdue(todo) ? 'overdue' : ''}">📅 ${formatDate(todo.dueDate)}</span>` 
            : '';
        const overdueClass = isOverdue(todo) ? 'overdue' : '';
        
        return `
            <li class="todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority} ${overdueClass}" data-id="${todo.id}">
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <span class="todo-date">🕒 ${formatDate(todo.createdAt)}</span>
                ${dueDateHtml}
                <button class="todo-delete">Удалить</button>
            </li>
        `;
    }).join('');
    
    document.querySelectorAll('.todo-item').forEach(item => {
        const id = parseInt(item.dataset.id);
        
        const checkbox = item.querySelector('.todo-checkbox');
        checkbox.addEventListener('change', () => toggleTodo(id));
        
        const deleteBtn = item.querySelector('.todo-delete');
        deleteBtn.addEventListener('click', () => deleteTodo(id));
        
        const textSpan = item.querySelector('.todo-text');
        textSpan.addEventListener('dblclick', () => editTodo(id));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadTodos();
    
    document.getElementById('addButton').addEventListener('click', addTodo);
    document.getElementById('todoInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });
    
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    document.getElementById('clearAll').addEventListener('click', clearAllTodos);
});