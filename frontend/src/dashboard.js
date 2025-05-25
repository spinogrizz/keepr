// Элементы DOM
const navLinks = document.querySelectorAll('.nav-links a');
const eventsList = document.querySelector('.events-list');
const assetTables = document.querySelector('.asset-tables');

// Состояние
let authToken = localStorage.getItem('authToken');

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
  // Инициализируем пользователя
  const initialized = await userManager.initialize();
  if (!initialized) {
    return;
  }
  
  setupEventListeners();
  loadDashboardData();
});



// Обработчики событий
function setupEventListeners() {
  // Навигация
  navLinks.forEach(link => {
    if ( link.getAttribute('href').startsWith('#')) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('href').substring(1);
      navigateToSection(section);
    });
    }
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
  const assetTables = document.querySelector('.asset-tables');

  if (section === 'dashboard') {
    dashboardStats.style.display = 'grid';
    quickActions.style.display = 'block';
    assetTables.style.display = 'none';
  } else {
    dashboardStats.style.display = 'none';
    quickActions.style.display = 'none';
    assetTables.style.display = 'block';
    loadAssets(section);
  }
}

// Загрузка данных
async function loadDashboardData() {
  try {
    // Загрузка активов для статистики
    const assets = await fetchData('/assets', authToken);
    
    // Расчет статистики из активов
    const stats = {
      equipment: assets.filter(a => a.asset_type === 'DEVICE').length,
      licenses: assets.filter(a => a.asset_type === 'LICENSE').length,
      certificates: assets.filter(a => a.asset_type === 'CERTIFICATE').length,
      alerts: assets.filter(a => a.status !== STATUS.ACTIVE).length
    };

    console.log(assets);
    console.log(stats);
    
    updateStats(stats);

    // Загрузка уведомлений для событий
    const notifications = await fetchData('/notifications', authToken);
    updateEvents(notifications);
  } catch (error) {
    console.error('Не удалось загрузить данные панели управления:', error);
    //addEvent('Не удалось загрузить данные панели управления: ' + error.message, 'error');
  }
}

// Состояние сортировки
let currentSortColumn = null;
let currentSortDirection = 'asc';

async function loadAssets(type) {
  try {
    const assets = await fetchData('/assets', authToken);
    const filteredAssets = assets.filter(asset => {
      const assetType = asset.asset_type.toLowerCase();
      return type === 'equipment' ? assetType === 'device' :
             type === 'licenses' ? assetType === 'license' :
             type === 'certificates' ? assetType === 'certificate' : false;
    });
    
    // Создаем заголовки таблицы в зависимости от типа
    createTableHeaders(type);
    
    // Отображаем данные
    displayAssets(filteredAssets, type);
    
    // Сбрасываем сортировку
    currentSortColumn = null;
    currentSortDirection = 'asc';
    
  } catch (error) {
    console.error(`Не удалось загрузить ${type}:`, error);
    addEvent(`Не удалось загрузить ${type}: ${error.message}`, 'error');
  }
}

function createTableHeaders(type) {
  const thead = document.querySelector('#tableHeaders');
  let headers = ['Название'];
  
  if (type === 'equipment') {
    headers.push('Расположение', 'Статус', 'IP-адрес', 'Действия');
  } else if (type === 'licenses') {
    headers.push('Проект', 'Статус', 'Поставщик', 'Действия');
  } else if (type === 'certificates') {
    headers.push('Проект', 'Статус', 'Домен/Хост', 'Действия');
  }
  
  thead.innerHTML = headers.map((header, index) => {
    const isActionColumn = header === 'Действия';
    return `<th ${!isActionColumn ? 'class="sortable" onclick="sortTable(' + index + ')"' : ''}>${header}</th>`;
  }).join('');
}

function displayAssets(assets, type) {
  const tbody = document.querySelector('#assetsTable tbody');
  tbody.innerHTML = assets.map(asset => {
    let row = `<td>${asset.name}</td>`;
    
    if (type === 'equipment') {
      row += `
        <td>${asset.location_name || '-'}</td>
        <td>${getStatusBadge(asset.status)}</td>
        <td>${getAssetIdentifier(asset)}</td>
      `;
    } else if (type === 'licenses') {
      row += `
        <td>${asset.project_name || '-'}</td>
        <td>${getStatusBadge(asset.status)}</td>
        <td>${getAssetIdentifier(asset)}</td>
      `;
    } else if (type === 'certificates') {
      row += `
        <td>${asset.project_name || '-'}</td>
        <td>${getStatusBadge(asset.status)}</td>
        <td>${getAssetIdentifier(asset)}</td>
      `;
    }
    
    row += `
      <td>
        <button onclick="editAsset('${asset.id}')" class="btn-secondary">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="deleteAsset('${asset.id}')" class="btn-secondary">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    return `<tr>${row}</tr>`;
  }).join('');
}







// Функция сортировки таблицы
function sortTable(columnIndex) {
  const table = document.getElementById('assetsTable');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const headers = table.querySelectorAll('th');
  
  // Определяем направление сортировки
  if (currentSortColumn === columnIndex) {
    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    currentSortDirection = 'asc';
    currentSortColumn = columnIndex;
  }
  
  // Убираем классы сортировки со всех заголовков
  headers.forEach(header => {
    header.classList.remove('sort-asc', 'sort-desc');
  });
  
  // Добавляем класс сортировки к текущему заголовку
  headers[columnIndex].classList.add(currentSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
  
  // Сортируем строки
  rows.sort((a, b) => {
    const aText = a.cells[columnIndex].textContent.trim();
    const bText = b.cells[columnIndex].textContent.trim();
    
    // Проверяем, являются ли значения числами
    const aNum = parseFloat(aText);
    const bNum = parseFloat(bText);
    
    let comparison = 0;
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      // Числовая сортировка
      comparison = aNum - bNum;
    } else {
      // Текстовая сортировка
      comparison = aText.localeCompare(bText, 'ru', { numeric: true });
    }
    
    return currentSortDirection === 'asc' ? comparison : -comparison;
  });
  
  // Перестраиваем таблицу
  rows.forEach(row => tbody.appendChild(row));
}

// Обновление интерфейса
function updateStats(stats) {
  document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = stats.equipment;
  document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = stats.licenses;
  document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = stats.certificates;
  document.querySelector('.stat-card:nth-child(4) .stat-number').textContent = stats.alerts;
}

function updateEvents(notifications) {
  if (!eventsList) return;
  
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
  if (!eventsList) return;
  
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



// Управление активами
async function editAsset(id) {
  try {
    const asset = await fetchData(`/assets/${id}`, authToken);
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
    await sendData(`/assets/${id}`, 'DELETE', {}, authToken);

    // Перезагружаем данные панели управления и текущую таблицу
    loadDashboardData();
    
    // Определяем текущий активный раздел и перезагружаем таблицу
    const activeLink = document.querySelector('.nav-links a.active');
    if (activeLink) {
      const section = activeLink.getAttribute('href').substring(1);
      if (section !== 'dashboard') {
        loadAssets(section);
      }
    }
    
    addEvent('Элемент успешно удален', 'success');
  } catch (error) {
    console.error('Не удалось удалить элемент:', error);
    addEvent('Не удалось удалить элемент: ' + error.message, 'error');
  }
}


