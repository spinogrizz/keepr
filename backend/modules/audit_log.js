const express = require('express');
const db = require('../db.js');
const router = express.Router();

// Получить журнал аудита (все записи)
router.get('/', async (req, res) => {
  try {
    const logs = await db.allAsync(`
      SELECT L.id, L.asset_id, A.name as asset_name, L.user_id, U.username as username,
             L.action_type, L.old_data, L.new_data, L.timestamp, L.comment
      FROM audit_log L
      LEFT JOIN assets A ON A.id = L.asset_id
      LEFT JOIN users U ON U.id = L.user_id
      ORDER BY L.timestamp DESC
    `);
    res.json(logs);
  } catch (err) {
    console.error("Error fetching audit log:", err);
    res.status(500).json({ message: 'Failed to fetch audit log' });
  }
});

module.exports = router;
