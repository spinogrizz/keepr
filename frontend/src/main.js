// ===== КОНСТАНТЫ =====
// Статусы активов в виде единого объекта
const STATUSES = {
  1: {
    name: 'ACTIVE',
    label: 'Активный',
    color: '#28a745' // зеленый
  },
  2: {
    name: 'INACTIVE',
    label: 'Неактивный',
    color: '#6c757d' // серый
  },
  3: {
    name: 'EXPIRED',
    label: 'Истёк',
    color: '#dc3545' // красный
  },
  4: {
    name: 'PENDING',
    label: 'Ожидает',
    color: '#ffc107' // желтый
  },
  5: {
    name: 'MAINTENANCE',
    label: 'Обслуживание',
    color: '#fd7e14' // оранжевый
  },
  6: {
    name: 'DECOMMISSIONED',
    label: 'Списан',
    color: '#343a40' // темно-серый
  }
};

// Для обратной совместимости
const STATUS = {
  ACTIVE: 1,
  INACTIVE: 2,
  EXPIRED: 3,
  PENDING: 4,
  MAINTENANCE: 5,
  DECOMMISSIONED: 6
};

// ===== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЕМ =====
class UserManager {
  constructor() {
    this.currentUser = null;
    this.authToken = localStorage.getItem('authToken');
  }

  // Получить информацию о текущем пользователе
  async getCurrentUser() {
    if (!this.authToken) {
      return null;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + this.authToken }
      });

      if (response.status === 401) {
        this.handleUnauthorized();
        return null;
      }

      if (!response.ok) {
        throw new Error('Не удалось получить информацию о пользователе');
      }

      this.currentUser = await response.json();
      return this.currentUser;
    } catch (error) {
      console.error('Ошибка при получении информации о пользователе:', error);
      return null;
    }
  }

  // Проверить, является ли пользователь администратором
  isAdmin() {
    console.log(this.currentUser);
    return this.currentUser && this.currentUser.role === 'admin';
  }

  // Получить отображаемое имя пользователя
  getDisplayName() {
    if (!this.currentUser) return 'Пользователь';
    
    // Приоритет: full_name -> username
    return this.currentUser.full_name || this.currentUser.username || 'Пользователь';
  }

  // Обновить UI в зависимости от роли пользователя
  updateUIForRole() {
    const adminElements = document.querySelectorAll('.admin-only');
    const isAdmin = this.isAdmin();
    
    adminElements.forEach(element => {
      if (isAdmin) {
        element.style.display = '';
      } else {
        element.style.display = 'none';
      }
    });
  }

  // Обновить отображение имени пользователя в шапке
  updateUserDisplay() {
    const userNameElements = document.querySelectorAll('.user-name');
    const displayName = this.getDisplayName();
    
    userNameElements.forEach(element => {
      element.textContent = displayName;
    });
  }

  // Инициализация пользователя (вызывать при загрузке страницы)
  async initialize() {
    if (!this.authToken) {
      window.location.href = '/index.html';
      return false;
    }

    const user = await this.getCurrentUser();
    if (!user) {
      return false;
    }

    this.updateUIForRole();
    this.updateUserDisplay();
    return true;
  }

  // Обработка неавторизованного доступа
  handleUnauthorized() {
    localStorage.removeItem('authToken');
    window.location.href = '/index.html';
  }
}

// ===== ОБЩИЕ УТИЛИТЫ =====

// Получение текста статуса
function getStatusText(status) {
  // Если status - число, используем STATUSES, иначе пытаемся найти по строке
  if (typeof status === 'number') {
    return STATUSES[status] ? STATUSES[status].label : status;
  } else {
    // Обратная совместимость для строковых статусов
    const statusMap = {
      'ACTIVE': 'Активный',
      'INACTIVE': 'Неактивный',
      'EXPIRED': 'Истёк',
      'PENDING': 'Ожидает',
      'MAINTENANCE': 'Обслуживание',
      'DECOMMISSIONED': 'Списан'
    };
    return statusMap[status] || status;
  }
}

// Получение HTML бейджа статуса
function getStatusBadge(status) {
  // Возвращает HTML для цветного бейджа статуса
  if (typeof status === 'number' && STATUSES[status]) {
    const statusInfo = STATUSES[status];
    return `<span class="status-badge" style="background-color: ${statusInfo.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">${statusInfo.label}</span>`;
  } else {
    return getStatusText(status);
  }
}

// Получение идентификатора актива
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

// Получение названия типа актива
function getAssetTypeName(type) {
  const types = {
    'DEVICE': 'устройство',
    'LICENSE': 'лицензию',
    'CERTIFICATE': 'сертификат'
  };
  return types[type] || 'актив';
}

// Экранирование HTML
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"/]/g, function (match) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    }[match];
  });
}

// Получение иконки для событий
function getEventIcon(type) {
  const icons = {
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle',
    error: 'fa-times-circle',
    success: 'fa-check-circle'
  };
  return icons[type.toLowerCase()] || icons.info;
}

// ===== HTTP УТИЛИТЫ =====

// Универсальная функция для GET запросов
async function fetchData(endpoint, authToken) {
  try {
    const response = await fetch(`/api${endpoint}`, {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (response.status === 401) {
      userManager.handleUnauthorized();
      return [];
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    //alert(`Не удалось загрузить данные для ${endpoint}.`);
    return [];
  }
}

// Универсальная функция для POST/PUT/DELETE запросов
async function sendData(endpoint, method, data, authToken) {
  try {
    const response = await fetch(`/api${endpoint}`, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken
      },
      body: JSON.stringify(data),
    });
    if (response.status === 401) {
      userManager.handleUnauthorized();
      return null;
    }
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error ${method}ing ${endpoint}:`, error);
    alert(`Ошибка: ${error.message}`);
    return null;
  }
}

// ===== ОБЩИЕ ОБРАБОТЧИКИ =====

// Универсальный обработчик выхода
async function handleLogout() {
  const authToken = localStorage.getItem('authToken');
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
  } catch (error) {
    console.error('Ошибка при выходе:', error);
  } finally {
    localStorage.removeItem('authToken');
    window.location.href = '/index.html';
  }
}

// Заполнение select'ов статусов
function populateStatusSelects() {
  const statusSelects = document.querySelectorAll('select[name="status"]');
  
  statusSelects.forEach(select => {
    // Очищаем существующие опции
    select.innerHTML = '';
    
    // Добавляем опции статусов
    Object.keys(STATUSES).forEach(statusId => {
      const status = STATUSES[statusId];
      const option = document.createElement('option');
      option.value = statusId;
      option.textContent = status.label;
      option.style.color = status.color;
      
      // По умолчанию выбираем "Активный"
      if (parseInt(statusId) === STATUS.ACTIVE) {
        option.selected = true;
      }
      
      select.appendChild(option);
    });
  });
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

// Создаем глобальный экземпляр менеджера пользователей
window.userManager = new UserManager();

// Глобальная инициализация для всех страниц
document.addEventListener('DOMContentLoaded', () => {
  // Настройка обработчика выхода, если кнопка существует
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}); 