const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db.js');
const router = express.Router();

// Получить всех пользователей (только администратор)
router.get('/', async (req, res) => {
  try {
    const users = await db.allAsync("SELECT id, username, role, full_name, email FROM users");
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Создать нового пользователя (только администратор)
router.post('/', async (req, res) => {
  const { username, password, role, full_name, email } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'username, password and role are required' });
  }
  const allowedRoles = ['admin', 'user'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  try {
    // Проверить, существует ли имя пользователя
    const existing = await db.getAsync("SELECT id FROM users WHERE username = ?", [username]);
    if (existing) {
      return res.status(409).json({ message: 'Username already exists' });
    }
    // Хэшировать пароль
    const saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds);
    const result = await db.runAsync(
      "INSERT INTO users (username, password_hash, role, full_name, email) VALUES (?, ?, ?, ?, ?)",
      [ username, hash, role, full_name || null, email || null ]
    );
    const newUser = {
      id: result.lastID,
      username: username,
      role: role,
      full_name: full_name || null,
      email: email || null
    };
    res.status(201).json(newUser);
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Обновить пользователя (только администратор)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, role, full_name, email } = req.body;

  // Basic validation
  if (!username || !role) {
    return res.status(400).json({ message: 'Username and role are required' });
  }
  const allowedRoles = ['admin', 'user']; 
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role specified' });
  }

  try {
    // Проверить, существует ли пользователь
    const currentUser = await db.getAsync("SELECT username FROM users WHERE id = ?", [id]);
    if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
    }
    if (username !== currentUser.username) {
        const existingUser = await db.getAsync("SELECT id FROM users WHERE username = ?", [username]);
        if (existingUser) {
            return res.status(409).json({ message: 'New username already exists' });
        }
    }

    let hash = null;
    if (password) {
      const saltRounds = 10;
      hash = bcrypt.hashSync(password, saltRounds);
    }

    let sql = "UPDATE users SET username = ?, role = ?, full_name = ?, email = ?";
    const params = [username, role, full_name || null, email || null];

    if (hash) {
      sql += ", password_hash = ?";
      params.push(hash);
    }
    sql += " WHERE id = ?";
    params.push(id);

    const result = await db.runAsync(sql, params);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'User not found or no changes made' });
    }

    const updatedUser = {
        id: parseInt(id),
        username: username,
        role: role,
        full_name: full_name || null,
        email: email || null
    };
    res.json(updatedUser);

  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Удалить пользователя (только администратор)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.runAsync("DELETE FROM users WHERE id = ?", [id]);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error("Error deleting user:", err);

    if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(400).json({ message: 'Cannot delete user: this user is referenced in other records (e.g., audit logs).' });
    }
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;
