const bcrypt = require('bcrypt');
const db = require('../db.js');
const config = require('../config.js');

async function initAdmin() {
  try {
    // Проверить, существует ли администратор
    const existingAdmin = await db.getAsync("SELECT id FROM users WHERE username = 'admin'");
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Получить пароль администратора из переменной окружения
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set');
      process.exit(1);
    }

    // Хэшировать пароль
    const saltRounds = 10;
    const hash = bcrypt.hashSync(adminPassword, saltRounds);

    // Создать администратора
    await db.runAsync(
      "INSERT INTO users (username, password_hash, role, full_name, email) VALUES (?, ?, ?, ?, ?)",
      ['admin', hash, 'admin', 'System Administrator', 'admin@example.com']
    );

    console.log('Admin user created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin user:', err);
    process.exit(1);
  }
}

initAdmin(); 