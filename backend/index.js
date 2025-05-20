const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');

console.log('config', config);

const {
  router,
  authenticateToken,
  authorizeRoles
} = require('./modules/auth');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Роут /api/auth подключаем как отдельно полученный router
app.use('/api/auth', router);

// Отдельные маршруты

// Управление активами
app.use('/api/assets', authenticateToken,
  authorizeRoles(['admin', 'editor', 'viewer']),
  require('./modules/assets.js')
);

//Управление проектами
app.use('/api/projects', authenticateToken,
  authorizeRoles(['admin', 'editor']),
  require('./modules/projects.js')
);

// Управление локациями
app.use('/api/locations', authenticateToken,
  authorizeRoles(['admin', 'editor']),
  require('./modules/locations.js')
);

// Управление пользователями
app.use('/api/users', authenticateToken,
  authorizeRoles(['admin']),
  require('./modules/users.js')
);

// Аудит-лог
app.use('/api/audit', authenticateToken,
  authorizeRoles(['admin']),
  require('./modules/audit_log.js')
);

// статические файлы фронтенда
app.use(express.static('../frontend'));

// запуск
app.listen(config.PORT, () => {
  console.log(`Server listening on http://localhost:${config.PORT}`);
});
