// Состояние
let authToken = localStorage.getItem('authToken');
let isEditing = false;
let currentAssetId = null;
let projects = [];
let locations = [];

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
  // Инициализируем пользователя
  const initialized = await userManager.initialize();
  if (!initialized) {
    return;
  }

  // Загружаем данные для select'ов
  await loadProjectsAndLocations();
  
  // Заполняем select'ы статусов
  populateStatusSelects();

  // Получаем параметры из URL
  const urlParams = new URLSearchParams(window.location.search);
  const assetType = urlParams.get('type');
  const assetId = urlParams.get('id');
  
  if (assetType) {
    switchForm(assetType);
  }

  // Если есть ID, значит мы редактируем существующий актив
  if (assetId) {
    isEditing = true;
    currentAssetId = assetId;
    // Скрываем переключатель форм при редактировании
    document.querySelector('.form-switcher').style.display = 'none';
    await loadAssetData(assetId);
  }

  setupEventListeners();
});

// Загрузка проектов и локаций
async function loadProjectsAndLocations() {
  try {
    // Загружаем проекты
    const projectsResponse = await fetch('/api/projects', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });

    if (projectsResponse.status === 401) {
      handleUnauthorized();
      return;
    }

    if (projectsResponse.ok) {
      projects = await projectsResponse.json();
    }

    // Загружаем локации
    const locationsResponse = await fetch('/api/locations', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });

    if (locationsResponse.ok) {
      locations = await locationsResponse.json();
    }

    // Заполняем select'ы
    populateSelects();
  } catch (error) {
    console.error('Ошибка при загрузке проектов и локаций:', error);
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

// Заполнение select'ов данными
function populateSelects() {
  // Заполняем проекты только в формах лицензий и сертификатов (не в форме устройств)
  document.querySelectorAll('#licenseForm select[name="project_id"], #certificateForm select[name="project_id"]').forEach(select => {
    // Очищаем существующие опции (кроме первой)
    while (select.children.length > 1) {
      select.removeChild(select.lastChild);
    }
    
    // Добавляем проекты
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      select.appendChild(option);
    });
  });

  // Заполняем локации только в форме устройств
  const deviceLocationSelect = document.querySelector('#deviceForm select[name="location_id"]');
  if (deviceLocationSelect) {
    // Очищаем существующие опции (кроме первой)
    while (deviceLocationSelect.children.length > 1) {
      deviceLocationSelect.removeChild(deviceLocationSelect.lastChild);
    }
    
    // Добавляем локации
    locations.forEach(location => {
      const option = document.createElement('option');
      option.value = location.id;
      option.textContent = location.name;
      deviceLocationSelect.appendChild(option);
    });
  }
}

// Загрузка данных актива
async function loadAssetData(id) {
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
    
    // Заполняем форму данными
    const form = document.getElementById(`${asset.asset_type.toLowerCase()}Form`);
    if (form) {
      const formData = new FormData(form);
      for (const [key, value] of Object.entries(asset)) {
        if (key === 'device' || key === 'license' || key === 'certificate') {
          // Заполняем специфичные поля для каждого типа актива
          for (const [subKey, subValue] of Object.entries(value)) {
            const input = form.querySelector(`[name="${subKey}"]`);
            if (input) {
              input.value = subValue;
            }
          }
        } else if (key !== 'id' && key !== 'asset_type') {
          // Заполняем общие поля
          const input = form.querySelector(`[name="${key}"]`);
          if (input) {
            if (input.tagName === 'SELECT') {
              // Для select'ов устанавливаем значение, если оно не пустое
              if (value) {
                input.value = value;
              }
            } else {
              input.value = value;
            }
          }
        }
      }

      // Обновляем текст кнопки отправки
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.textContent = 'Сохранить изменения';
      }
    }

    // Обновляем заголовок формы
    const formTitle = form.querySelector('h2');
    if (formTitle) {
      formTitle.textContent = `Редактировать ${getAssetTypeName(asset.asset_type)}`;
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных актива:', error);
    const errorElement = document.querySelector('.error-message');
    if (errorElement) {
      errorElement.textContent = error.message;
    }
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

// Обработчики событий
function setupEventListeners() {
  // Переключение форм
  document.querySelectorAll('.switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      switchForm(type);
    });
  });

  // Обработка отправки форм
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', handleFormSubmit);
  });

  // Выход
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// Переключение форм
function switchForm(type) {
  // Обновляем активное состояние кнопок
  document.querySelectorAll('.switch-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  // Показываем нужную форму
  document.querySelectorAll('.asset-form').forEach(form => {
    form.classList.toggle('active', form.id === `${type}Form`);
  });

  // Обновляем URL без перезагрузки страницы
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set('type', type);
  window.history.pushState({}, '', newUrl);
}

// Обработка отправки формы
async function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  const type = form.id.replace('Form', '');

  // Обрабатываем пустые значения select'ов
  if (data.project_id === '') {
    data.project_id = null;
  }
  if (data.location_id === '') {
    data.location_id = null;
  }
  
  // Преобразуем статус в число, если он не задан - используем ACTIVE по умолчанию
  if (data.status) {
    data.status = parseInt(data.status);
  } else {
    data.status = STATUS.ACTIVE;
  }

  try {
    const url = isEditing ? `/api/assets/${currentAssetId}` : '/api/assets';
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken
      },
      body: JSON.stringify({
        ...data,
        asset_type: type.toUpperCase()
      })
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Не удалось сохранить элемент');
    }

    // После успешного сохранения возвращаемся на дашборд
    window.location.href = 'dashboard.html';
  } catch (error) {
    const errorElement = form.querySelector('.error-message');
    errorElement.textContent = error.message;
  }
}

// Вспомогательная функция для обработки неавторизованных ответов
function handleUnauthorized() {
  userManager.handleUnauthorized();
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