document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE_URL = '/api'; // Assuming your API routes are prefixed with /api
  
  // Инициализируем пользователя
  const initialized = await userManager.initialize();
  if (!initialized) {
    return;
  }
  
  let authToken = localStorage.getItem('authToken');

  // DOM Elements for Projects
  const projectsList = document.getElementById('projects-list');
  const projectForm = document.getElementById('project-form');
  const projectIdInput = document.getElementById('project-id');
  const projectNameInput = document.getElementById('project-name');
  const cancelProjectEditBtn = document.getElementById('cancel-project-edit');

  // DOM Elements for Locations (will be used later)
  const locationsList = document.getElementById('locations-list');
  const locationForm = document.getElementById('location-form');
  const locationIdInput = document.getElementById('location-id');
  const locationNameInput = document.getElementById('location-name');
  const cancelLocationEditBtn = document.getElementById('cancel-location-edit');

  // DOM Elements for Users (will be used later)
  const usersList = document.getElementById('users-list');
  const userForm = document.getElementById('user-form');
  const userIdInput = document.getElementById('user-id');
  const userUsernameInput = document.getElementById('user-username');
  const userPasswordInput = document.getElementById('user-password');
  const userFullNameInput = document.getElementById('user-full-name');
  const userEmailInput = document.getElementById('user-email');
  const userRoleInput = document.getElementById('user-role');
  const cancelUserEditBtn = document.getElementById('cancel-user-edit');

  // --- Helper Functions ---
  // Вспомогательная функция для обработки неавторизованных ответов
  function handleUnauthorized() {
    userManager.handleUnauthorized();
  }

  async function fetchData(endpoint) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 'Authorization': 'Bearer ' + authToken }
      });
      if (response.status === 401) {
        handleUnauthorized();
        return [];
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      alert(`Не удалось загрузить данные для ${endpoint}.`);
      return [];
    }
  }

  async function sendData(endpoint, method, data) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify(data),
      });
      if (response.status === 401) {
        handleUnauthorized();
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

  // --- Projects --- 
  async function loadProjects() {
    const projects = await fetchData('/projects');
    projectsList.innerHTML = ''; // Clear existing list
    projects.forEach(project => {
      const listItem = document.createElement('div');
      listItem.classList.add('list-item');
      listItem.innerHTML = `
        <div class="item-details">
          <span class="item-name">${escapeHTML(project.name)} (ID: ${project.id})</span>
        </div>
        <div class="item-actions">
          <button class="edit-btn" data-id="${project.id}" data-name="${escapeHTML(project.name)}"><i class="fas fa-edit"></i> Редактировать</button>
          <button class="delete-btn" data-id="${project.id}"><i class="fas fa-trash"></i> Удалить</button>
        </div>
      `;
      projectsList.appendChild(listItem);
    });
  }

  projectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = projectIdInput.value;
    const name = projectNameInput.value;
    if (!name.trim()) {
        alert('Название проекта не может быть пустым.');
        return;
    }

    const payload = { name };
    let result;
    if (id) { // Update existing project
      result = await sendData(`/projects/${id}`, 'PUT', payload); 
    } else { // Create new project
      result = await sendData('/projects', 'POST', payload);
    }

    if (result) {
      resetProjectForm();
      loadProjects();
      alert(id ? 'Проект успешно обновлен!' : 'Проект успешно создан!');
    }
  });

  projectsList.addEventListener('click', async (event) => {
    const target = event.target.closest('button');
    if (!target) return;

    const projectId = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
      projectIdInput.value = projectId;
      projectNameInput.value = target.dataset.name; // Assuming name is stored on button
      projectForm.querySelector('button[type="submit"]').textContent = 'Сохранить изменения';
      cancelProjectEditBtn.style.display = 'inline-block';
      projectNameInput.focus();
    }

    if (target.classList.contains('delete-btn')) {
      if (confirm('Вы уверены, что хотите удалить этот проект? Это действие не может быть отменено.')) {
        const result = await sendData(`/projects/${projectId}`, 'DELETE', {});
        if (result !== null) { // Check if delete was successful (sendData returns null on error, empty object on success for DELETE)
          loadProjects();
          alert('Проект успешно удален!');
          resetProjectForm(); // Reset form if the deleted item was being edited
        }
      }
    }
  });

  cancelProjectEditBtn.addEventListener('click', () => {
    resetProjectForm();
  });

  function resetProjectForm() {
    projectIdInput.value = '';
    projectNameInput.value = '';
    projectForm.querySelector('button[type="submit"]').textContent = 'Сохранить проект';
    cancelProjectEditBtn.style.display = 'none';
  }
  
  function escapeHTML(str) {
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

  // --- Locations (Placeholder - to be implemented) ---
  async function loadLocations() {
    const locations = await fetchData('/locations');
    locationsList.innerHTML = ''; // Clear existing list
    locations.forEach(location => {
      const listItem = document.createElement('div');
      listItem.classList.add('list-item');
      listItem.innerHTML = `
        <div class="item-details">
          <span class="item-name">${escapeHTML(location.name)} (ID: ${location.id})</span>
        </div>
        <div class="item-actions">
          <button class="edit-btn" data-id="${location.id}" data-name="${escapeHTML(location.name)}"><i class="fas fa-edit"></i> Редактировать</button>
          <button class="delete-btn" data-id="${location.id}"><i class="fas fa-trash"></i> Удалить</button>
        </div>
      `;
      locationsList.appendChild(listItem);
    });
  }

  locationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = locationIdInput.value;
    const name = locationNameInput.value;
    if (!name.trim()) {
        alert('Название местоположения не может быть пустым.');
        return;
    }

    const payload = { name };
    let result;
    if (id) { // Update existing location
      result = await sendData(`/locations/${id}`, 'PUT', payload);
    } else { // Create new location
      result = await sendData('/locations', 'POST', payload);
    }

    if (result) {
      resetLocationForm();
      loadLocations();
      alert(id ? 'Местоположение успешно обновлено!' : 'Местоположение успешно создано!');
    }
  });

  locationsList.addEventListener('click', async (event) => {
    const target = event.target.closest('button');
    if (!target) return;

    const locationId = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
      locationIdInput.value = locationId;
      locationNameInput.value = target.dataset.name; 
      locationForm.querySelector('button[type="submit"]').textContent = 'Сохранить изменения';
      cancelLocationEditBtn.style.display = 'inline-block';
      locationNameInput.focus();
    }

    if (target.classList.contains('delete-btn')) {
      if (confirm('Вы уверены, что хотите удалить это местоположение? Это действие не может быть отменено.')) {
        const result = await sendData(`/locations/${locationId}`, 'DELETE', {});
        if (result !== null) {
          loadLocations();
          alert('Местоположение успешно удалено!');
          resetLocationForm();
        }
      }
    }
  });

  cancelLocationEditBtn.addEventListener('click', () => {
    resetLocationForm();
  });

  function resetLocationForm() {
    locationIdInput.value = '';
    locationNameInput.value = '';
    locationForm.querySelector('button[type="submit"]').textContent = 'Сохранить местоположение';
    cancelLocationEditBtn.style.display = 'none';
  }

  // --- Users (Placeholder - to be implemented) ---
  async function loadUsers() {
    const users = await fetchData('/users');
    usersList.innerHTML = ''; // Clear existing list
    users.forEach(user => {
      const listItem = document.createElement('div');
      listItem.classList.add('list-item');
      listItem.innerHTML = `
        <div class="item-details">
          <span class="item-name">${escapeHTML(user.username)}</span>
          <span>(Роль: ${escapeHTML(user.role)})</span>
          <span>(ФИО: ${escapeHTML(user.full_name || 'N/A')})</span>
          <span>(Email: ${escapeHTML(user.email || 'N/A')})</span>
        </div>
        <div class="item-actions">
          <button class="edit-btn" 
            data-id="${user.id}" 
            data-username="${escapeHTML(user.username)}" 
            data-role="${escapeHTML(user.role)}" 
            data-fullname="${escapeHTML(user.full_name || '')}" 
            data-email="${escapeHTML(user.email || '')}">
            <i class="fas fa-edit"></i> Редактировать
          </button>
          <button class="delete-btn" data-id="${user.id}"><i class="fas fa-trash"></i> Удалить</button>
        </div>
      `;
      usersList.appendChild(listItem);
    });
  }

  userForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = userIdInput.value;
    const username = userUsernameInput.value;
    const password = userPasswordInput.value; // Optional for update
    const role = userRoleInput.value;
    const full_name = userFullNameInput.value;
    const email = userEmailInput.value;

    if (!username.trim() || !role.trim()) {
        alert('Имя пользователя и роль обязательны.');
        return;
    }
    if (!id && !password) { // Password required for new user
        alert('Пароль обязателен для нового пользователя.');
        return;
    }

    const payload = { username, role, full_name, email };
    if (password) { // Only include password if provided
      payload.password = password;
    }

    let result;
    if (id) { // Update existing user
      result = await sendData(`/users/${id}`, 'PUT', payload);
    } else { // Create new user
      result = await sendData('/users', 'POST', payload);
    }

    if (result) {
      resetUserForm();
      loadUsers();
      alert(id ? 'Пользователь успешно обновлен!' : 'Пользователь успешно создан!');
    }
  });

  usersList.addEventListener('click', async (event) => {
    const target = event.target.closest('button');
    if (!target) return;

    const userId = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
      userIdInput.value = userId;
      userUsernameInput.value = target.dataset.username;
      userPasswordInput.value = ''; // Clear password field for edit
      userPasswordInput.placeholder = 'Пароль (оставьте пустым чтобы не менять)';
      userRoleInput.value = target.dataset.role;
      userFullNameInput.value = target.dataset.fullname;
      userEmailInput.value = target.dataset.email;
      
      userForm.querySelector('button[type="submit"]').textContent = 'Сохранить изменения';
      cancelUserEditBtn.style.display = 'inline-block';
      userUsernameInput.focus();
    }

    if (target.classList.contains('delete-btn')) {
      // It might be dangerous to allow deletion of users directly, 
      // especially the last admin. Consider adding checks or a soft delete.
      if (confirm('Вы уверены, что хотите удалить этого пользователя? Это действие не может быть отменено.')) {
        const result = await sendData(`/users/${userId}`, 'DELETE', {});
        if (result !== null) {
          loadUsers();
          alert('Пользователь успешно удален!');
          resetUserForm();
        }
      }
    }
  });

  cancelUserEditBtn.addEventListener('click', () => {
    resetUserForm();
  });

  function resetUserForm() {
    userIdInput.value = '';
    userUsernameInput.value = '';
    userPasswordInput.value = '';
    userPasswordInput.placeholder = 'Пароль';
    userRoleInput.value = 'user'; // Default role
    userFullNameInput.value = '';
    userEmailInput.value = '';
    userForm.querySelector('button[type="submit"]').textContent = 'Сохранить пользователя';
    cancelUserEditBtn.style.display = 'none';
  }

  // Initial data load
  loadProjects();
  loadLocations(); // Will be implemented
  loadUsers();     // Will be implemented

  // Обработчик выхода
  document.getElementById('logoutBtn').addEventListener('click', async () => {
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
  });
}); 