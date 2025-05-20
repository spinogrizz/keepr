const db = require('../db.js');

// Запись события в журнал аудита
async function logEvent(userId, assetId, actionType, oldDataObj, newDataObj, comment) {
  const timestamp = new Date().toISOString().replace('T',' ').split('.')[0];
  let oldDataStr = null;
  let newDataStr = null;
  if (oldDataObj) {
    try {
      oldDataStr = JSON.stringify(oldDataObj);
    } catch (e) { oldDataStr = String(oldDataObj); }
  }
  if (newDataObj) {
    try {
      newDataStr = JSON.stringify(newDataObj);
    } catch (e) { newDataStr = String(newDataObj); }
  }
  const sql = `INSERT INTO audit_log (asset_id, user_id, action_type, old_data, new_data, timestamp, comment) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const params = [assetId || null, userId || null, actionType, oldDataStr, newDataStr, timestamp, comment || null];
  try {
    await db.runAsync(sql, params);
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}

module.exports = { logEvent };
