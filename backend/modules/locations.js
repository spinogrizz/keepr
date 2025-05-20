const express = require('express');
const db = require('../db.js');
const router = express.Router();

// Get all locations
router.get('/', async (req, res) => {
  try {
    const locations = await db.allAsync("SELECT * FROM locations");
    res.json(locations);
  } catch (err) {
    console.error("Error fetching locations:", err);
    res.status(500).json({ message: 'Failed to fetch locations' });
  }
});

// Create a new location
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

module.exports = router;
