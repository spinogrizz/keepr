const express = require('express');
const db = require('../db.js');
const router = express.Router();

// Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await db.allAsync("SELECT * FROM projects");
    res.json(projects);
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Create a new project
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }
  try {
    const result = await db.runAsync("INSERT INTO projects (name) VALUES (?)", [name]);
    const newProject = { id: result.lastID, name: name };
    res.status(201).json(newProject);
  } catch (err) {
    console.error("Error creating project:", err);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

module.exports = router;
