const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Use file path from env or default in data directory
const dbFilePath = process.env.DB_FILE || path.join(dataDir, 'database.sqlite');

// Open SQLite database
const db = new sqlite3.Database(dbFilePath);

// Initialize tables if not exist
db.serialize(() => {
  // Enable foreign keys enforcement
  db.run(`PRAGMA foreign_keys = ON`);

  // Projects table
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);

  // Locations table
  db.run(`CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);

  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    full_name TEXT,
    email TEXT
  )`);

  // Assets table (central registry of IT assets)
  db.run(`CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    project_id INTEGER,
    location_id INTEGER,
    responsible TEXT,
    description TEXT,
    creation_date TEXT,
    expiry_date TEXT,
    status INTEGER,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE SET NULL
  )`);

  // Certificates table (details for SSL certificates)
  db.run(`CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL UNIQUE,
    cert_file TEXT,
    cert_key_file TEXT,
    domain_host TEXT,
    FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
  )`);

  // Licenses table (details for software licenses)
  db.run(`CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL UNIQUE,
    license_key TEXT,
    vendor TEXT,
    seat_count INTEGER,
    FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
  )`);

  // Devices table (details for physical/network devices)
  db.run(`CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL UNIQUE,
    ip_address TEXT,
    serial_num TEXT,
    model TEXT,
    last_seen TEXT,
    online INTEGER,
    FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
  )`);

  // Audit log table (records all changes and events)
  db.run(`CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER,
    user_id INTEGER,
    action_type TEXT,
    old_data TEXT,
    new_data TEXT,
    timestamp TEXT,
    comment TEXT,
    FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE SET NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  )`);
});

// Promisify the sqlite3 functions for convenience
const { promisify } = require('util');
db.allAsync = promisify(db.all).bind(db);
db.getAsync = promisify(db.get).bind(db);
db.runAsync = function(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this); // 'this' holds lastID, changes, etc.
    });
  });
};

module.exports = db;
