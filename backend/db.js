const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

// Убедиться, что директория данных существует
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Использовать путь к файлу из переменной окружения или по умолчанию в директории данных
const dbFilePath = process.env.DB_FILE || path.join(dataDir, 'database.sqlite');

// Открыть SQLite базу данных
const db = new sqlite3.Database(dbFilePath);

// Инициализировать таблицы, если они не существуют
db.serialize(() => {
  // Включить принудительное соблюдение внешних ключей
  db.run(`PRAGMA foreign_keys = ON`);

  // Таблица проектов
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);

  // Таблица местоположений
  db.run(`CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);

  // Таблица пользователей
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    full_name TEXT,
    email TEXT
  )`);

  // Таблица активов (центральный реестр IT активов)
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

  // Таблица сертификатов (детали для SSL сертификатов)
  db.run(`CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL UNIQUE,
    cert_file TEXT,
    cert_key_file TEXT,
    domain_host TEXT,
    FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
  )`);

  // Таблица лицензий (детали для программных лицензий)
  db.run(`CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL UNIQUE,
    license_key TEXT,
    vendor TEXT,
    seat_count INTEGER,
    FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
  )`);

  // Таблица устройств (детали для физических/сетевых устройств)
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

  // Таблица журнала аудита (записывает все изменения и события)
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

// Преобразовать функции sqlite3 в Promise для удобства
const { promisify } = require('util');
db.allAsync = promisify(db.all).bind(db);
db.getAsync = promisify(db.get).bind(db);
db.runAsync = function(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this); 
    });
  });
};

module.exports = db;
