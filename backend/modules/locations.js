const express = require('express');
const db = require('../db.js');
const router = express.Router();

// Получить все местоположения
router.get('/', async (req, res) => {
  try {
    const locations = await db.allAsync("SELECT * FROM locations");
    res.json(locations);
  } catch (err) {
    console.error("Error fetching locations:", err);
    res.status(500).json({ message: 'Failed to fetch locations' });
  }
});

// Создать новое местоположение
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Location name is required' });
  }
  try {
    const result = await db.runAsync("INSERT INTO locations (name) VALUES (?)", [name]);
    const newLocation = { id: result.lastID, name: name };
    res.status(201).json(newLocation);
  } catch (err) {
    console.error("Error creating location:", err);
    res.status(500).json({ message: 'Failed to create location' });
  }
});

// Обновить местоположение
router.put('/:id', async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;
  if (!name) {
    return res.status(400).json({ message: 'Location name is required' });
  }
  try {
    const result = await db.runAsync("UPDATE locations SET name = ? WHERE id = ?", [name, id]);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Location not found' });
    }
    res.json({ id: parseInt(id), name: name });
  } catch (err) {
    console.error("Error updating location:", err);
    res.status(500).json({ message: 'Failed to update location' });
  }
});

// Удалить местоположение
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.runAsync("DELETE FROM locations WHERE id = ?", [id]);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Location not found' });
    }
    res.status(200).json({ message: 'Location deleted successfully' }); // Changed from 204 to allow a body
  } catch (err) {
    console.error("Error deleting location:", err);
    // Check for foreign key constraint violation
    if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
        return res.status(400).json({ message: 'Cannot delete location: it is currently associated with one or more assets. Please reassign or remove these assets before deleting the location.' });
    }
    res.status(500).json({ message: 'Failed to delete location' });
  }
});

module.exports = router;
