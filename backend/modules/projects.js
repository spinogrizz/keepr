const express = require('express');
const db = require('../db.js');
const router = express.Router();

// Получить все проекты
router.get('/', async (req, res) => {
  try {
    const projects = await db.allAsync("SELECT * FROM projects");
    res.json(projects);
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Создать новый проект
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

// Обновить проект
router.put('/:id', async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;
  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }
  try {
    const result = await db.runAsync("UPDATE projects SET name = ? WHERE id = ?", [name, id]);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ id: parseInt(id), name: name });
  } catch (err) {
    console.error("Error updating project:", err);
    res.status(500).json({ message: 'Failed to update project' });
  }
});

// Удалить проект
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.runAsync("DELETE FROM projects WHERE id = ?", [id]);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(200).json({ message: 'Project deleted successfully' }); // Changed from 204 to 200 to allow a body
  } catch (err) {
    console.error("Error deleting project:", err);
    // Check for foreign key constraint violation
    if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(400).json({ message: 'Cannot delete project: it is currently associated with one or more assets. Please reassign or remove these assets before deleting the project.' });
    }
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

module.exports = router;
