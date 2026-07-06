const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const app = express();
const PORT = 5000;

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
});

const User = sequelize.define('User', {
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
});

const Todo = sequelize.define('Todo', {
    text: { type: DataTypes.STRING, allowNull: false },
    completed: { type: DataTypes.BOOLEAN, defaultValue: false },
    priority: { type: DataTypes.STRING, defaultValue: 'medium' },
    due_date: { type: DataTypes.DATEONLY, allowNull: true }
});

User.hasMany(Todo, { foreignKey: 'UserId', onDelete: 'CASCADE' });
Todo.belongsTo(User, { foreignKey: 'UserId' });

app.use(cors());
app.use(express.json());


app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const existing = await User.findOne({ where: { email } });
        if (existing) return res.status(400).json({ error: 'Email уже используется' });

        const password_hash = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password_hash });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: 'Неверный email или пароль' });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

app.get('/api/todos', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Не авторизован' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const todos = await Todo.findAll({
            where: { UserId: decoded.id },
            order: [['id', 'DESC']]
        });
        res.json(todos);
    } catch (error) {
        console.error('Get todos error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/todos', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Не авторизован' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const { text, priority, due_date } = req.body;
        if (!text) return res.status(400).json({ error: 'Текст обязателен' });

        const todo = await Todo.create({
            text,
            priority: priority || 'medium',
            due_date: due_date || null,
            UserId: decoded.id
        });
        res.json(todo);
    } catch (error) {
        console.error('Create todo error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/todos/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Не авторизован' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const todo = await Todo.findOne({
            where: { id: req.params.id, UserId: decoded.id }
        });
        if (!todo) return res.status(404).json({ error: 'Задача не найдена' });

        const { completed, text, priority, due_date } = req.body;
        if (completed !== undefined) todo.completed = completed;
        if (text) todo.text = text;
        if (priority) todo.priority = priority;
        if (due_date !== undefined) todo.due_date = due_date;
        await todo.save();
        res.json(todo);
    } catch (error) {
        console.error('Update todo error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/todos/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Не авторизован' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const todo = await Todo.findOne({
            where: { id: req.params.id, UserId: decoded.id }
        });
        if (!todo) return res.status(404).json({ error: 'Задача не найдена' });

        await todo.destroy();
        res.json({ message: 'Удалено' });
    } catch (error) {
        console.error('Delete todo error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ===== ЗАПУСК =====

// ВАЖНО: сейчас force: true (пересоздаст таблицы)
sequelize.sync({ force: false }).then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
        console.log('✅ База данных синхронизирована (таблицы пересозданы)');
    });
}).catch(err => {
    console.error('❌ Ошибка подключения к базе:', err);
});