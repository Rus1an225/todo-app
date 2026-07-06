const API_URL = 'http://localhost:5000/api';

let todos = [];
let currentFilter = 'all';
let token = localStorage.getItem('token');

function checkAuth() {
    if (token) {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('todoContainer').style.display = 'block';
        loadTodos();
    } else {
        document.getElementById('authContainer').style.display = 'block';
        document.getElementById('todoContainer').style.display = 'none';
    }
}

function toggleAuthMode() {
    const button = document.getElementById('authButton');
    const link = document.getElementById('switchToRegister');
    if (button.textContent === 'Войти') {
        button.textContent = 'Зарегистрироваться';
        link.textContent = 'Уже есть аккаунт? Войти';
    } else {
        button.textContent = 'Войти';
        link.textContent = 'Нет аккаунта? Зарегистрироваться';
    }
    document.getElementById('authError').textContent = '';
}

async function handleAuth() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const errorEl = document.getElementById('authError');
    
    if (!email || !password) {
        errorEl.textContent = 'Заполните все поля';
        errorEl.classList.add('show');
        return;
    }
    
    const isRegister = document.getElementById('authButton').textContent === 'Зарегистрироваться';
    const endpoint = isRegister ? '/register' : '/login';
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            errorEl.textContent = '';
            errorEl.classList.remove('show');
            checkAuth();
        } else {
            errorEl.textContent = data.error || 'Ошибка авторизации';
            errorEl.classList.add('show');
        }
    } catch (error) {
        errorEl.textContent = 'Ошибка соединения с сервером';
        errorEl.classList.add('show');
        console.error('Auth error:', error);
    }
}

function logout() {
    localStorage.removeItem('token');
    token = null;
    checkAuth();
}

async function loadTodos() {
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/todos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            todos = await response.json();
            renderTodos();
        } else if (response.status === 401) {
            logout();
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
}

async function addTodo() {
    const input = document.getElementById('todoInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const dueDateInput = document.getElementById('dueDateInput');
    const text = input.value.trim();
    
    if (text === '') {
        alert('Пожалуйста, введите текст задачи!');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/todos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                text: text,
                priority: prioritySelect.value,
                due_date: dueDateInput.value || null
            })
        });
        
        if (response.ok) {
            const newTodo = await response.json();
            todos.push(newTodo);
            renderTodos();
            input.value = '';
            dueDateInput.value = '';
            input.focus();
        } else if (response.status === 401) {
            logout();
        }
    } catch (error) {
        console.error('Ошибка добавления:', error);
    }
}

async function deleteTodo(id) {
    try {
        const response = await fetch(`${API_URL}/todos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            todos = todos.filter(t => t.id !== id);
            renderTodos();
        } else if (response.status === 401) {
            logout();
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
    }
}

async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    try {
        const response = await fetch(`${API_URL}/todos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ completed: !todo.completed })
        });
        
        if (response.ok) {
            const updated = await response.json();
            const index = todos.findIndex(t => t.id === id);
            todos[index] = updated;
            renderTodos();
        } else if (response.status === 401) {
            logout();
        }
    } catch (error) {
        console.error('Ошибка обновления:', error);
    }
}

async function editTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const newText = prompt('Редактировать задачу:', todo.text);
    if (newText === null) return;
    if (newText.trim() === '') {
        alert('Текст не может быть пустым');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/todos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text: newText.trim() })
        });
        
        if (response.ok) {
            const updated = await response.json();
            const index = todos.findIndex(t => t.id === id);
            todos[index] = updated;
            renderTodos();
        } else if (response.status === 401) {
            logout();
        }
    } catch (error) {
        console.error('Ошибка редактирования:', error);
    }
}

async function clearAllTodos() {
    if (todos.length === 0) return;
    if (!confirm('Вы уверены, что хотите удалить все задачи?')) return;
    
    for (const todo of todos) {
        await deleteTodo(todo.id);
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
    if (!todo.due_date || todo.completed) return false;
    return new Date(todo.due_date) < new Date();
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
        const dueDateHtml = todo.due_date 
            ? `<span class="todo-due ${isOverdue(todo) ? 'overdue' : ''}">📅 ${formatDate(todo.due_date)}</span>` 
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
    document.getElementById('authButton').addEventListener('click', handleAuth);
    document.getElementById('authEmail').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAuth();
    });
    document.getElementById('authPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAuth();
    });
    document.getElementById('switchToRegister').addEventListener('click', toggleAuthMode);
    document.getElementById('logoutButton').addEventListener('click', logout);
    
    document.getElementById('addButton').addEventListener('click', addTodo);
    document.getElementById('todoInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });
    
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('clearAll').addEventListener('click', clearAllTodos);
    
    checkAuth();
});