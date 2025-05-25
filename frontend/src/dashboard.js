// Элементы DOM
const navLinks = document.querySelectorAll('.nav-links a');
const eventsList = document.querySelector('.events-list');
const assetTables = document.querySelector('.asset-tables');

// Состояние
let currentUser = null;
let isAdmin = false;
let authToken = localStorage.getItem('authToken');

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
  if (!authToken) {
    window.location.href = '/index.html';
    return;
  }
  setupEventListeners();
  loadDashboardData();
});

// Вспомогательная функция для обработки неавторизованных ответов
function handleUnauthorized() {
  localStorage.removeItem('authToken');
  window.location.href = '/index.html';
}

// Обработчики событий
function setupEventListeners() {
  // Навигация
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('href').substring(1);
      navigateToSection(section);
    });
  });

  // Выход
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// Навигация
function navigateToSection(section) {
  // Обновление активного состояния
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${section}`) {
      link.classList.add('active');
    }
  });

  // Показать/скрыть разделы
  const dashboardStats = document.querySelector('.dashboard-stats');
  const quickActions = document.querySelector('.quick-actions');
  // const eventsFeed = document.querySelector('.events-feed');
  const assetTables = document.querySelector('.asset-tables');

  if (section === 'dashboard') {
    dashboardStats.style.display = 'grid';
    quickActions.style.display = 'block';
    // eventsFeed.style.display = 'block';
    assetTables.style.display = 'none';
  } else {
    dashboardStats.style.display = 'none';
    quickActions.style.display = 'none';
    // eventsFeed.style.display = 'none';
    assetTables.style.display = 'block';
    loadAssets(section);
  }
}

// Загрузка данных
async function loadDashboardData() {
  try {
    // Загрузка активов для статистики
    const assetsResponse = await fetch('/api/assets', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    
    if (assetsResponse.status === 401) {
      handleUnauthorized();
      return;
    }
    
    if (!assetsResponse.ok) {
      throw new Error('Не удалось загрузить активы');
    }
    
    const assets = await assetsResponse.json();
    

    // Расчет статистики из активов
    const stats = {
      equipment: assets.filter(a => a.asset_type === 'DEVICE').length,
      licenses: assets.filter(a => a.asset_type === 'LICENSE').length,
      certificates: assets.filter(a => a.asset_type === 'CERTIFICATE').length,
      alerts: assets.filter(a => a.status !== 'ACTIVE').length
    };

    console.log(assets);
    console.log(stats);
    
    updateStats(stats);

    // Загрузка уведомлений для событий
    const notificationsResponse = await fetch('/api/notifications', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    
    if (notificationsResponse.status === 401) {
      handleUnauthorized();
      return;
    }
    
    if (!notificationsResponse.ok) {
      throw new Error('Не удалось загрузить уведомления');
    }
    
    const notifications = await notificationsResponse.json();

    updateEvents(notifications);
  } catch (error) {
    console.error('Не удалось загрузить данные панели управления:', error);
    addEvent('Не удалось загрузить данные панели управления: ' + error.message, 'error');
  }
}

async function loadAssets(type) {
  try {
    const response = await fetch('/api/assets', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    
    if (!response.ok) {
      throw new Error('Не удалось загрузить активы');
    }
    
    const assets = await response.json();
    const filteredAssets = assets.filter(asset => {
      const assetType = asset.asset_type.toLowerCase();
      return type === 'equipment' ? assetType === 'device' :
             type === 'licenses' ? assetType === 'license' :
             type === 'certificates' ? assetType === 'certificate' : false;
    });
    
    const tbody = document.querySelector('#assetsTable tbody');
    tbody.innerHTML = filteredAssets.map(asset => `
      <tr>
        <td>${asset.name}</td>
        <td>${asset.asset_type}</td>
        <td>${asset.project_name || '-'}</td>
        <td>${asset.location_name || '-'}</td>
        <td>${asset.status}</td>
        <td>${getAssetIdentifier(asset)}</td>
        <td>
          <button onclick="editAsset('${asset.id}')" class="btn-secondary">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="deleteAsset('${asset.id}')" class="btn-secondary">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error(`Не удалось загрузить ${type}:`, error);
    addEvent(`Не удалось загрузить ${type}: ${error.message}`, 'error');
  }
}

function getAssetIdentifier(asset) {
  switch (asset.asset_type) {
    case 'DEVICE':
      return asset.device?.ip_address || '-';
    case 'LICENSE':
      return asset.license?.vendor || '-';
    case 'CERTIFICATE':
      return asset.certificate?.domain_host || '-';
    default:
      return '-';
  }
}

// Обновление интерфейса
function updateStats(stats) {
  document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = stats.equipment;
  document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = stats.licenses;
  document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = stats.certificates;
  document.querySelector('.stat-card:nth-child(4) .stat-number').textContent = stats.alerts;
}

function updateEvents(notifications) {
  eventsList.innerHTML = notifications.map(notification => `
    <div class="event-item ${notification.type.toLowerCase()}">
      <i class="fas ${getEventIcon(notification.type)}"></i>
      <div class="event-content">
        <p class="event-message">${notification.message}</p>
        <p class="event-time">${new Date(notification.created_at).toLocaleString()}</p>
      </div>
    </div>
  `).join('');
}

function addEvent(message, type = 'info') {
  const eventElement = document.createElement('div');
  eventElement.className = `event-item ${type}`;
  eventElement.innerHTML = `
    <i class="fas ${getEventIcon(type)}"></i>
    <div class="event-content">
      <p class="event-message">${message}</p>
      <p class="event-time">${new Date().toLocaleString()}</p>
    </div>
  `;
  
  eventsList.insertBefore(eventElement, eventsList.firstChild);
}

function getEventIcon(type) {
  const icons = {
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle',
    error: 'fa-times-circle',
    success: 'fa-check-circle'
  };
  return icons[type.toLowerCase()] || icons.info;
}

// Управление активами
async function editAsset(id) {
  try {
    const response = await fetch(`/api/assets/${id}`, {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      throw new Error('Не удалось загрузить данные актива');
    }

    const asset = await response.json();
    window.location.href = `add.html?type=${asset.asset_type.toLowerCase()}&id=${id}`;
  } catch (error) {
    console.error('Не удалось загрузить данные актива:', error);
    addEvent('Не удалось загрузить данные актива: ' + error.message, 'error');
  }
}

async function deleteAsset(id) {
  if (!confirm('Вы уверены, что хотите удалить этот элемент?')) {
    return;
  }

  try {
    const response = await fetch(`/api/assets/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + authToken }
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      throw new Error('Не удалось удалить элемент');
    }

    loadDashboardData();
    addEvent('Элемент успешно удален', 'success');
  } catch (error) {
    console.error('Не удалось удалить элемент:', error);
    addEvent('Не удалось удалить элемент: ' + error.message, 'error');
  }
}

// Выход
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    localStorage.removeItem('authToken');
    window.location.href = '/index.html';
  } catch (error) {
    console.error('Ошибка при выходе:', error);
  }
}
