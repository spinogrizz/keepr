document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) {
        const data = await response.json();
        errorEl.textContent = data.message || 'Login failed';
      } else {
        const data = await response.json();
        // Сохранение токена в локальном хранилище
        localStorage.setItem('authToken', data.token);
        // Перенаправление на панель управления
        window.location.href = 'dashboard.html';
      }
    } catch (err) {
      console.error('Login error', err);
      errorEl.textContent = 'Error connecting to server';
    }
  });
  