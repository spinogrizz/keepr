const cron = require('node-cron');
const db = require('../db.js');
const config = require('../config.js');
const audit = require('./audit.js');
const notifications = require('./notifications.js');
const ping = require('ping');

// Проверка истекающих активов (сертификаты, лицензии и т.д.)
async function checkExpirations() {
  console.log('[Monitoring] Starting expiration check...');
  try {
    const today = new Date();
    const assets = await db.allAsync("SELECT id, name, asset_type, responsible, expiry_date FROM assets WHERE expiry_date IS NOT NULL");
    console.log(`[Monitoring] Found ${assets.length} assets with expiry dates to check`);
    
    for (const asset of assets) {
      if (!asset.expiry_date) continue;
      const expDate = new Date(asset.expiry_date);
      if (isNaN(expDate.getTime())) continue;
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= config.EXPIRE_WARNING_DAYS) {
        console.log(`[Monitoring] Asset "${asset.name}" (${asset.asset_type}) is ${diffDays < 0 ? 'expired' : `expiring in ${diffDays} days`}`);
        let message;
        let actionType;
        if (diffDays < 0) {
          // Уже истек
          actionType = 'EXPIRED';
          message = `Asset "${asset.name}" (Type: ${asset.asset_type}) has expired on ${asset.expiry_date}.`;
        } else {
          // Предупреждение о предстоящем истечении
          actionType = 'EXPIRY_WARNING';
          message = `Asset "${asset.name}" (Type: ${asset.asset_type}) is expiring on ${asset.expiry_date} (in ${diffDays} days).`;
        }
        // Запись события в журнал аудита (системный пользователь)
        await audit.logEvent(null, asset.id, actionType, null, null, message);
        // Отправка уведомлений
        let email;
        if (asset.responsible) {
          const user = await db.getAsync("SELECT email FROM users WHERE username = ?", [asset.responsible]);
          if (user && user.email) {
            email = user.email;
          }
        }
        const subject = (diffDays < 0) ? `Asset ${asset.name} expired` : `Asset ${asset.name} expiring soon`;
        if (email) {
          notifications.sendEmail(email, subject, message);
        }
        notifications.sendTelegram(message);
      }
    }
    console.log('[Monitoring] Expiration check completed');
  } catch (err) {
    console.error("[Monitoring] Error in checkExpirations:", err);
  }
}

// Проверка доступности устройств (пинг устройств)
async function checkDevices() {
  console.log('[Monitoring] Starting device availability check...');
  try {
    const devices = await db.allAsync(`
      SELECT d.id as device_id, d.asset_id, d.ip_address, d.online, a.name, a.responsible 
      FROM devices d 
      JOIN assets a ON a.id = d.asset_id
    `);
    console.log(`[Monitoring] Found ${devices.length} devices to check`);
    
    for (const d of devices) {
      if (!d.ip_address) continue;
      console.log(`[Monitoring] Checking device "${d.name}" (${d.ip_address})...`);
      let isAlive = false;
      try {
        const res = await ping.promise.probe(d.ip_address, { timeout: 5 });
        isAlive = res.alive;
        console.log(`[Monitoring] Device "${d.name}" is ${isAlive ? 'online' : 'offline'}`);
      } catch (pingErr) {
        console.error(`[Monitoring] Ping error for ${d.ip_address}:`, pingErr);
        isAlive = false;
      }
      const wasOnline = (d.online === 1 || d.online === null);
      const nowStr = new Date().toISOString().replace('T',' ').split('.')[0];
      if (isAlive) {
        // Устройство ответило
        if (!wasOnline) {
          // Было недоступно, теперь восстановлено
          await db.runAsync("UPDATE devices SET online = 1, last_seen = ? WHERE id = ?", [nowStr, d.device_id]);
          const comment = `Device "${d.name}" (IP ${d.ip_address}) is now reachable.`;
          await audit.logEvent(null, d.asset_id, 'DEVICE_UP', null, null, comment);
          // Уведомление о восстановлении
          notifications.sendTelegram(comment);
          if (d.responsible) {
            const user = await db.getAsync("SELECT email FROM users WHERE username = ?", [d.responsible]);
            if (user && user.email) {
              notifications.sendEmail(user.email, `Device ${d.name} is back online`, comment);
            }
          }
        } else {
          // Все еще онлайн, обновление времени последнего ответа
          await db.runAsync("UPDATE devices SET online = 1, last_seen = ? WHERE id = ?", [nowStr, d.device_id]);
        }
      } else {
        // Устройство не ответило
        if (wasOnline) {
          // Было доступно (или неизвестно) раньше, теперь недоступно
          await db.runAsync("UPDATE devices SET online = 0 WHERE id = ?", [d.device_id]);
          const comment = `Device "${d.name}" (IP ${d.ip_address}) is not reachable!`;
          await audit.logEvent(null, d.asset_id, 'DEVICE_DOWN', null, null, comment);
          notifications.sendTelegram(comment);
          if (d.responsible) {
            const user = await db.getAsync("SELECT email FROM users WHERE username = ?", [d.responsible]);
            if (user && user.email) {
              notifications.sendEmail(user.email, `Device ${d.name} is DOWN`, comment);
            }
          }
        }
        // Если уже было недоступно, ничего не делаем (избегаем спама повторных предупреждений)
      }
    }
    console.log('[Monitoring] Device availability check completed');
  } catch (err) {
    console.error("[Monitoring] Error in checkDevices:", err);
  }
}

// Планирование cron-задач
// Ежедневно в полночь для проверки истечения срока
cron.schedule('0 0 * * *', () => {
  checkExpirations();
}, { timezone: 'UTC' });
// Каждые 5 минут для проверки доступности устройств
cron.schedule('*/5 * * * *', () => {
  checkDevices();
});

module.exports = {
  checkExpirations,
  checkDevices
};
