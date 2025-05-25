// Модуль для работы с пользователем
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

// Создаем глобальный экземпляр
window.userManager = new UserManager(); 