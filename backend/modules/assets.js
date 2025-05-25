const express = require('express');
const db = require('../db.js');
const audit = require('../modules/audit.js');

const router = express.Router();

// Получить все активы (с подробностями)
router.get('/', async (req, res) => {
  try {
    const assets = await db.allAsync("SELECT * FROM assets");
    const result = [];
    for (const asset of assets) {
      const assetObj = { ...asset };
      // Прикрепить имя проекта
      if (asset.project_id) {
        const proj = await db.getAsync("SELECT name FROM projects WHERE id = ?", [asset.project_id]);
        assetObj.project_name = proj ? proj.name : null;
      }
      // Прикрепить имя местоположения
      if (asset.location_id) {
        const loc = await db.getAsync("SELECT name FROM locations WHERE id = ?", [asset.location_id]);
        assetObj.location_name = loc ? loc.name : null;
      }
      // Прикрепить тип-специфичные детали
      if (asset.asset_type === 'CERTIFICATE') {
        const cert = await db.getAsync("SELECT domain_host, cert_file, cert_key_file FROM certificates WHERE asset_id = ?", [asset.id]);
        assetObj.certificate = cert || {};
      } else if (asset.asset_type === 'LICENSE') {
        const lic = await db.getAsync("SELECT license_key, vendor, seat_count FROM licenses WHERE asset_id = ?", [asset.id]);
        assetObj.license = lic || {};
      } else if (asset.asset_type === 'DEVICE') {
        const dev = await db.getAsync("SELECT ip_address, serial_num, model, last_seen, online FROM devices WHERE asset_id = ?", [asset.id]);
        assetObj.device = dev || {};
      }
      result.push(assetObj);
    }
    res.json(result);
  } catch (err) {
    console.error("Error fetching assets:", err);
    res.status(500).json({ message: 'Failed to fetch assets' });
  }
});

// Получить один актив по ID (с подробностями)
router.get('/:id', async (req, res) => {
  try {
    const assetId = req.params.id;
    const asset = await db.getAsync("SELECT * FROM assets WHERE id = ?", [assetId]);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }
    if (asset.project_id) {
      const proj = await db.getAsync("SELECT name FROM projects WHERE id = ?", [asset.project_id]);
      asset.project_name = proj ? proj.name : null;
    }
    if (asset.location_id) {
      const loc = await db.getAsync("SELECT name FROM locations WHERE id = ?", [asset.location_id]);
      asset.location_name = loc ? loc.name : null;
    }
    if (asset.asset_type === 'CERTIFICATE') {
      const cert = await db.getAsync("SELECT id, domain_host, cert_file, cert_key_file FROM certificates WHERE asset_id = ?", [assetId]);
      asset.certificate = cert || {};
    } else if (asset.asset_type === 'LICENSE') {
      const lic = await db.getAsync("SELECT id, license_key, vendor, seat_count FROM licenses WHERE asset_id = ?", [assetId]);
      asset.license = lic || {};
    } else if (asset.asset_type === 'DEVICE') {
      const dev = await db.getAsync("SELECT id, ip_address, serial_num, model, last_seen, online FROM devices WHERE asset_id = ?", [assetId]);
      asset.device = dev || {};
    }
    res.json(asset);
  } catch (err) {
    console.error("Error fetching asset:", err);
    res.status(500).json({ message: 'Failed to fetch asset' });
  }
});

// Создать новый актив (и его подтип записи)
router.post('/', async (req, res) => {
  const {
    name, asset_type, project_id, location_id,
    responsible, description,
    creation_date, expiry_date,
    ip_address, serial_num, model,
    license_key, vendor, seat_count,
    domain_host, cert_file, cert_key_file
  } = req.body;
  if (!name || !asset_type) {
    return res.status(400).json({ message: 'name and asset_type are required' });
  }
  const type = asset_type.toUpperCase();
  if (!['DEVICE', 'LICENSE', 'CERTIFICATE'].includes(type)) {
    return res.status(400).json({ message: 'Invalid asset_type' });
  }
  // Только администратор/редактор может создавать (viewer запрещен)
  if (req.user && req.user.role === 'viewer') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  let newAssetId = null;
  try {
    const respUser = responsible || (req.user ? req.user.username : null);
    const assetInsert = await db.runAsync(
      `INSERT INTO assets (name, asset_type, project_id, location_id, responsible, description, creation_date, expiry_date, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, type,
        project_id || null,
        location_id || null,
        respUser || null,
        description || null,
        creation_date || null,
        expiry_date || null,
        1
      ]
    );
    newAssetId = assetInsert.lastID;
    // Вставить в подтип таблицу
    if (type === 'DEVICE') {
      await db.runAsync(
        `INSERT INTO devices (asset_id, ip_address, serial_num, model, online) VALUES (?, ?, ?, ?, ?)`,
        [newAssetId, ip_address || null, serial_num || null, model || null, 1]
      );
    } else if (type === 'LICENSE') {
      await db.runAsync(
        `INSERT INTO licenses (asset_id, license_key, vendor, seat_count) VALUES (?, ?, ?, ?)`,
        [newAssetId, license_key || null, vendor || null, seat_count || null]
      );
    } else if (type === 'CERTIFICATE') {
      await db.runAsync(
        `INSERT INTO certificates (asset_id, cert_file, cert_key_file, domain_host) VALUES (?, ?, ?, ?)`,
        [newAssetId, cert_file || null, cert_key_file || null, domain_host || null]
      );
    }
    // Записать создание
    await audit.logEvent(req.user ? req.user.id : null, newAssetId, 'CREATE', null, { name: name, asset_type: type }, 'Asset created');
    // Вернуть новый актив (с подробностями)
    const createdAsset = await db.getAsync("SELECT * FROM assets WHERE id = ?", [newAssetId]);
    if (type === 'DEVICE') {
      createdAsset.device = await db.getAsync("SELECT ip_address, serial_num, model, last_seen, online FROM devices WHERE asset_id = ?", [newAssetId]);
    } else if (type === 'LICENSE') {
      createdAsset.license = await db.getAsync("SELECT license_key, vendor, seat_count FROM licenses WHERE asset_id = ?", [newAssetId]);
    } else if (type === 'CERTIFICATE') {
      createdAsset.certificate = await db.getAsync("SELECT domain_host, cert_file, cert_key_file FROM certificates WHERE asset_id = ?", [newAssetId]);
    }
    res.status(201).json(createdAsset);
  } catch (err) {
    console.error("Error creating asset:", err);
    if (newAssetId) {
      await db.runAsync("DELETE FROM assets WHERE id = ?", [newAssetId]);
    }
    res.status(500).json({ message: 'Failed to create asset' });
  }
});

// Обновить существующий актив
router.put('/:id', async (req, res) => {
  const assetId = req.params.id;
  // Только администратор/редактор может обновлять
  if (req.user && req.user.role === 'viewer') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const asset = await db.getAsync("SELECT * FROM assets WHERE id = ?", [assetId]);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }
    const type = asset.asset_type;
    let detail = null;
    if (type === 'DEVICE') {
      detail = await db.getAsync("SELECT * FROM devices WHERE asset_id = ?", [assetId]);
    } else if (type === 'LICENSE') {
      detail = await db.getAsync("SELECT * FROM licenses WHERE asset_id = ?", [assetId]);
    } else if (type === 'CERTIFICATE') {
      detail = await db.getAsync("SELECT * FROM certificates WHERE asset_id = ?", [assetId]);
    }
    // Determine changed fields for audit
    const oldData = {};
    const newData = {};
    const baseFields = ['name', 'project_id', 'location_id', 'responsible', 'description', 'creation_date', 'expiry_date', 'status'];
    for (const key in req.body) {
      if (baseFields.includes(key)) {
        if (asset[key] !== undefined && asset[key] != req.body[key]) {
          oldData[key] = asset[key];
          newData[key] = req.body[key];
        }
      } else {
        if (detail && detail[key] !== undefined && detail[key] != req.body[key]) {
          oldData[key] = detail[key];
          newData[key] = req.body[key];
        }
      }
    }
    // Обновить таблицу активов
    if (Object.keys(req.body).some(f => baseFields.includes(f))) {
      const { name, project_id, location_id, responsible, description, creation_date, expiry_date, status } = req.body;
      await db.runAsync(
        `UPDATE assets SET 
           name = COALESCE(?, name),
           project_id = COALESCE(?, project_id),
           location_id = COALESCE(?, location_id),
           responsible = COALESCE(?, responsible),
           description = COALESCE(?, description),
           creation_date = COALESCE(?, creation_date),
           expiry_date = COALESCE(?, expiry_date),
           status = COALESCE(?, status)
         WHERE id = ?`,
        [name, project_id, location_id, responsible, description, creation_date, expiry_date, status, assetId]
      );
    }
    // Обновить подтип таблицу, если нужно
    if (type === 'DEVICE') {
      const { ip_address, serial_num, model } = req.body;
      if (ip_address || serial_num || model) {
        await db.runAsync(
          `UPDATE devices SET 
             ip_address = COALESCE(?, ip_address),
             serial_num = COALESCE(?, serial_num),
             model = COALESCE(?, model)
           WHERE asset_id = ?`,
          [ip_address, serial_num, model, assetId]
        );
      }
    } else if (type === 'LICENSE') {
      const { license_key, vendor, seat_count } = req.body;
      if (license_key || vendor || seat_count) {
        await db.runAsync(
          `UPDATE licenses SET 
             license_key = COALESCE(?, license_key),
             vendor = COALESCE(?, vendor),
             seat_count = COALESCE(?, seat_count)
           WHERE asset_id = ?`,
          [license_key, vendor, seat_count, assetId]
        );
      }
    } else if (type === 'CERTIFICATE') {
      const { domain_host, cert_file, cert_key_file } = req.body;
      if (domain_host || cert_file || cert_key_file) {
        await db.runAsync(
          `UPDATE certificates SET 
             domain_host = COALESCE(?, domain_host),
             cert_file = COALESCE(?, cert_file),
             cert_key_file = COALESCE(?, cert_key_file)
           WHERE asset_id = ?`,
          [domain_host, cert_file, cert_key_file, assetId]
        );
      }
    }
    // Записать обновление, если изменились какие-либо поля
    if (Object.keys(newData).length > 0) {
      await audit.logEvent(req.user ? req.user.id : null, assetId, 'UPDATE', oldData, newData, 'Asset updated');
    }
    // Return updated asset
    const updatedAsset = await db.getAsync("SELECT * FROM assets WHERE id = ?", [assetId]);
    if (type === 'DEVICE') {
      updatedAsset.device = await db.getAsync("SELECT ip_address, serial_num, model, last_seen, online FROM devices WHERE asset_id = ?", [assetId]);
    } else if (type === 'LICENSE') {
      updatedAsset.license = await db.getAsync("SELECT license_key, vendor, seat_count FROM licenses WHERE asset_id = ?", [assetId]);
    } else if (type === 'CERTIFICATE') {
      updatedAsset.certificate = await db.getAsync("SELECT domain_host, cert_file, cert_key_file FROM certificates WHERE asset_id = ?", [assetId]);
    }
    res.json(updatedAsset);
  } catch (err) {
    console.error("Error updating asset:", err);
    res.status(500).json({ message: 'Failed to update asset' });
  }
});

// Удалить актив (и его подтип записи через каскад)
router.delete('/:id', async (req, res) => {
  const assetId = req.params.id;
  // Только администратор/редактор может удалять
  if (req.user && req.user.role === 'viewer') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const asset = await db.getAsync("SELECT * FROM assets WHERE id = ?", [assetId]);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }
    // Идентифицировать актив для записи
    let identifier = '';
    if (asset.asset_type === 'DEVICE') {
      const dev = await db.getAsync("SELECT ip_address FROM devices WHERE asset_id = ?", [assetId]);
      identifier = dev && dev.ip_address ? `IP ${dev.ip_address}` : '';
    } else if (asset.asset_type === 'CERTIFICATE') {
      const cert = await db.getAsync("SELECT domain_host FROM certificates WHERE asset_id = ?", [assetId]);
      identifier = cert && cert.domain_host ? cert.domain_host : '';
    } else if (asset.asset_type === 'LICENSE') {
      const lic = await db.getAsync("SELECT vendor FROM licenses WHERE asset_id = ?", [assetId]);
      identifier = lic && lic.vendor ? lic.vendor : '';
    }
    // Удалить актив (подзаписи удалены через внешний ключ каскада)
    await db.runAsync("DELETE FROM assets WHERE id = ?", [assetId]);
    // Записать событие удаления
    const comment = `Asset "${asset.name}" ${identifier ? '('+identifier+') ' : ''}deleted`;
    await audit.logEvent(req.user ? req.user.id : null, assetId, 'DELETE', null, null, comment);
    res.json({ message: 'Asset deleted' });
  } catch (err) {
    console.error("Error deleting asset:", err);
    res.status(500).json({ message: 'Failed to delete asset' });
  }
});

module.exports = router;
