const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db.js'); 
const config = require('../config.js');

const router = express.Router();

// Маршрут входа (POST /api/auth/login)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }
    // Поиск пользователя по имени пользователя
    const user = await db.getAsync("SELECT * FROM users WHERE username = ?", [username]);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Проверка пароля
    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Генерация JWT токена
    const tokenPayload = { userId: user.id, username: user.username, role: user.role };
    const token = jwt.sign(tokenPayload, config.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Получить информацию о текущем пользователе (GET /api/auth/me)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Получаем полную информацию о пользователе из базы данных
    const user = await db.getAsync(
      "SELECT id, username, role, full_name, email FROM users WHERE id = ?", 
      [req.user.id]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error("Error fetching user info:", err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Middleware аутентификации – проверяет JWT токен
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    // Прикрепление информации о пользователе к запросу
    req.user = { id: decoded.userId, username: decoded.username, role: decoded.role };
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Forbidden' });
  }
}

// Фабрика middleware авторизации – ограничивает доступ для указанных ролей
function authorizeRoles(roles = []) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

module.exports = {
  router,
  authenticateToken,
  authorizeRoles
};
