const SUPABASE_URL = 'https://foqqwmuwvnljtzecwsmm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kh6AM_-0qmbr0MUH8T54Bg_urE6cRAu';

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

async function register(email, password) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email, password })
    });
    return await response.json();
}

async function login(email, password) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email, password })
    });
    return await response.json();
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

    if (password.length < 6) {
        errorEl.textContent = 'Пароль должен быть не менее 6 символов';
        errorEl.classList.add('show');
        return;
    }
    
    const isRegister = document.getElementById('authButton').textContent === 'Зарегистрироваться';
    
    try {
        let data;
        if (isRegister) {
            data = await register(email, password);
        } else {
            data = await login(email, password);
        }
        
        if (data.access_token) {
            token = data.access_token;
            localStorage.setItem('token', token);
            localStorage.setItem('userId', data.user.id);
            errorEl.textContent = '';
            errorEl.classList.remove('show');
            checkAuth();
        } else {
            errorEl.textContent = data.message || data.error_description || 'Ошибка авторизации';
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
        const response = await fetch(`${SUPABASE_URL}/rest/v1/todos?select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`
            }
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
        const userId = localStorage.getItem('userId');
        if (!userId) {
            alert('Ошибка: пользователь не авторизован');
            return;
        }
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/todos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                text: text,
                priority: prioritySelect.value,
                due_date: dueDateInput.value || null,
                user_id: userId
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            const newTodo = Array.isArray(result) ? result[0] : result;
            todos.push(newTodo);
            renderTodos();
            input.value = '';
            dueDateInput.value = '';
            input.focus();
        } else {
            const error = await response.text();
            console.error('Ошибка от Supabase:', error);
            alert('Не удалось добавить задачу');
        }
    } catch (error) {
        console.error('Ошибка добавления:', error);
        alert('Ошибка соединения с сервером');
    }
}

async function deleteTodo(id) {
    console.log('Удаляем задачу с id:', id);
    if (id === undefined || id === null || isNaN(id)) {
        console.error('Ошибка: неверный id для удаления', id);
        return;
    }
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/todos?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            todos = todos.filter(t => t.id !== id);
            renderTodos();
        } else if (response.status === 401) {
            logout();
        } else {
            const error = await response.json();
            console.error('Ошибка удаления:', error);
            alert('Не удалось удалить задачу');
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        alert('Ошибка соединения с сервером');
    }
}

async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/todos?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ completed: !todo.completed })
        });
        
        if (response.ok) {
            todo.completed = !todo.completed;
            renderTodos();
        } else {
            const error = await response.text();
            console.error('Ошибка обновления:', error);
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
        const response = await fetch(`${SUPABASE_URL}/rest/v1/todos?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text: newText.trim() })
        });
        
        if (response.ok) {
            const updated = await response.json();
            const index = todos.findIndex(t => t.id === id);
            todos[index] = updated[0];
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
                <span class="todo-date">🕒 ${formatDate(todo.created_at)}</span>
                ${dueDateHtml}
                <button class="todo-delete">Удалить</button>
            </li>
        `;
    }).join('');
    
    document.querySelectorAll('.todo-item').forEach(item => {
        const id = parseInt(item.dataset.id);
        if (isNaN(id)) {
            console.error('Ошибка: id не число', item.dataset.id);
            return;
        }
        
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