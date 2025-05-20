const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db.js');
const router = express.Router();

// Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    const users = await db.allAsync("SELECT id, username, role, full_name, email FROM users");
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Create a new user (admin only)
router.post('/', async (req, res) => {
  const { username, password, role, full_name, email } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'username, password and role are required' });
  }
  const allowedRoles = ['admin'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  try {
    // Check if username already exists
    const existing = await db.getAsync("SELECT id FROM users WHERE username = ?", [username]);
    if (existing) {
      return res.status(409).json({ message: 'Username already exists' });
    }
    // Hash password
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

module.exports = router;
