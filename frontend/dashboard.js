const token = localStorage.getItem('authToken');
if (!token) {
  // Не авторизован, перенаправление на страницу входа
  window.location.href = 'index.html';
}

// Обработчик кнопки выхода
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('authToken');
  window.location.href = 'index.html';
});

// Загрузка и отображение всех активов в таблице
async function loadAssets() {
  try {
    const resp = await fetch('/api/assets', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!resp.ok) {
      console.error('Failed to load assets');
      return;
    }
    const assets = await resp.json();
    const tbody = document.querySelector('#assetsTable tbody');
    tbody.innerHTML = '';
    for (const asset of assets) {
      const tr = document.createElement('tr');
      // Имя
      const tdName = document.createElement('td');
      tdName.textContent = asset.name;
      // Тип
      const tdType = document.createElement('td');
      tdType.textContent = asset.asset_type;
      // Название проекта
      const tdProj = document.createElement('td');
      tdProj.textContent = asset.project_name || '';
      // Название местоположения
      const tdLoc = document.createElement('td');
      tdLoc.textContent = asset.location_name || '';
      // Статус (интерпретация кода)
      const tdStatus = document.createElement('td');
      tdStatus.textContent = asset.status == 1 ? 'Active' : asset.status;
      // Идентификатор (ключевая деталь в зависимости от типа)
      const tdIdent = document.createElement('td');
      if (asset.asset_type === 'DEVICE') {
        const ip = asset.device && asset.device.ip_address ? asset.device.ip_address : '';
        const online = asset.device && asset.device.online;
        tdIdent.textContent = ip;
        if (online === 0) {
          tdIdent.textContent += ' [DOWN]';
          tdIdent.classList.add('down');
        }
      } else if (asset.asset_type === 'CERTIFICATE') {
        tdIdent.textContent = asset.certificate && asset.certificate.domain_host ? asset.certificate.domain_host : '';
      } else if (asset.asset_type === 'LICENSE') {
        tdIdent.textContent = asset.license && asset.license.vendor ? asset.license.vendor : '';
      } else {
        tdIdent.textContent = '';
      }
      tr.appendChild(tdName);
      tr.appendChild(tdType);
      tr.appendChild(tdProj);
      tr.appendChild(tdLoc);
      tr.appendChild(tdStatus);
      tr.appendChild(tdIdent);
      tbody.appendChild(tr);
    }
  } catch (err) {
    console.error('Error loading assets:', err);
  }
}

// Обработчики форм для добавления активов
document.getElementById('deviceForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById('deviceError');
  errorEl.textContent = '';
  const payload = {
    name: form.name.value,
    asset_type: 'DEVICE',
    ip_address: form.ip_address.value,
    serial_num: form.serial_num.value,
    model: form.model.value
  };
  try {
    const resp = await fetch('/api/assets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const data = await resp.json();
      errorEl.textContent = data.message || 'Failed to add device';
    } else {
      form.reset();
      loadAssets();
    }
  } catch (err) {
    console.error('Add device error:', err);
    errorEl.textContent = 'Error adding device';
  }
});

document.getElementById('licenseForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById('licenseError');
  errorEl.textContent = '';
  const payload = {
    name: form.name.value,
    asset_type: 'LICENSE',
    license_key: form.license_key.value,
    vendor: form.vendor.value,
    seat_count: form.seat_count.value ? parseInt(form.seat_count.value) : null,
    expiry_date: form.expiry_date.value || null
  };
  try {
    const resp = await fetch('/api/assets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const data = await resp.json();
      errorEl.textContent = data.message || 'Failed to add license';
    } else {
      form.reset();
      loadAssets();
    }
  } catch (err) {
    console.error('Add license error:', err);
    errorEl.textContent = 'Error adding license';
  }
});

document.getElementById('certForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById('certError');
  errorEl.textContent = '';
  const payload = {
    name: form.name.value,
    asset_type: 'CERTIFICATE',
    domain_host: form.domain_host.value,
    expiry_date: form.expiry_date.value
  };
  try {
    const resp = await fetch('/api/assets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const data = await resp.json();
      errorEl.textContent = data.message || 'Failed to add certificate';
    } else {
      form.reset();
      loadAssets();
    }
  } catch (err) {
    console.error('Add cert error:', err);
    errorEl.textContent = 'Error adding certificate';
  }
});

// Начальная загрузка
loadAssets();
