const API_BASE = window.location.port === '' || window.location.port === '80'
  ? ''
  : `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;

let allTodos = [];
let currentFilter = 'all';

// DOM Elements
const todoList = document.getElementById('todoList');
const todoForm = document.getElementById('todoForm');
const todoTitle = document.getElementById('todoTitle');
const todoDescription = document.getElementById('todoDescription');
const submitBtn = document.getElementById('submitBtn');
const statTotal = document.getElementById('statTotal');
const statPending = document.getElementById('statPending');
const statCompleted = document.getElementById('statCompleted');
const healthPill = document.getElementById('systemHealth');
const healthText = document.getElementById('healthText');
const filterTabs = document.querySelectorAll('.tab-btn');
const toastContainer = document.getElementById('toastContainer');

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Fetch health status
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    if (res.ok && data.status === 'UP') {
      healthPill.className = 'health-pill healthy';
      healthText.textContent = `Cluster Online (${data.services.database.status})`;
    } else {
      healthPill.className = 'health-pill degraded';
      healthText.textContent = 'Database Reconnecting';
    }
  } catch (err) {
    healthPill.className = 'health-pill offline';
    healthText.textContent = 'API Offline';
  }
}

// Fetch all todos
async function fetchTodos() {
  try {
    const res = await fetch(`${API_BASE}/todos`);
    const result = await res.json();
    if (result.success) {
      allTodos = result.data;
      updateStats();
      renderTodos();
    } else {
      showToast(result.error?.message || 'Failed to fetch tasks', 'error');
    }
  } catch (err) {
    console.error('Fetch error:', err);
    todoList.innerHTML = `
      <div class="empty-state">
        <p>⚠️ Cannot connect to Todo API.</p>
        <p style="font-size:12px; margin-top:8px;">Ensure containers are running with <code>docker compose up</code>.</p>
      </div>`;
  }
}

// Update stats counters
function updateStats() {
  const total = allTodos.length;
  const completed = allTodos.filter(t => t.isCompleted).length;
  const pending = total - completed;

  statTotal.textContent = total;
  statPending.textContent = pending;
  statCompleted.textContent = completed;
}

// Render todos list
function renderTodos() {
  const filtered = allTodos.filter(todo => {
    if (currentFilter === 'active') return !todo.isCompleted;
    if (currentFilter === 'completed') return todo.isCompleted;
    return true;
  });

  if (filtered.length === 0) {
    todoList.innerHTML = `
      <div class="empty-state">
        <p>No tasks found in this view.</p>
        <p style="font-size:12px; margin-top:4px;">Add a new task above to get started.</p>
      </div>`;
    return;
  }

  todoList.innerHTML = filtered.map(todo => {
    const formattedDate = new Date(todo.createdAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      <div class="todo-item ${todo.isCompleted ? 'completed' : ''}" data-id="${todo._id}">
        <input 
          type="checkbox" 
          class="todo-checkbox" 
          ${todo.isCompleted ? 'checked' : ''} 
          onchange="toggleTodoStatus('${todo._id}', this.checked)"
        />
        <div class="todo-content">
          <div class="todo-title">${escapeHtml(todo.title)}</div>
          ${todo.description ? `<div class="todo-desc">${escapeHtml(todo.description)}</div>` : ''}
          <div class="todo-meta">ID: ${todo._id.substring(0, 8)}... · Created ${formattedDate}</div>
        </div>
        <button class="btn btn-danger" onclick="deleteTodo('${todo._id}')" title="Delete Task">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;
  }).join('');
}

// Escape HTML for XSS prevention
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Create new todo
todoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = todoTitle.value.trim();
  const description = todoDescription.value.trim();

  if (!title) return;

  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = 'Adding...';

  try {
    const res = await fetch(`${API_BASE}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });

    const result = await res.json();
    if (res.ok && result.success) {
      allTodos.unshift(result.data);
      todoForm.reset();
      updateStats();
      renderTodos();
      showToast('Task added successfully!');
    } else {
      showToast(result.error?.message || 'Failed to create task', 'error');
    }
  } catch (err) {
    showToast('Network error while creating task', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'Add Task';
  }
});

// Toggle todo completion
async function toggleTodoStatus(id, isCompleted) {
  try {
    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted }),
    });

    const result = await res.json();
    if (res.ok && result.success) {
      const idx = allTodos.findIndex(t => t._id === id);
      if (idx !== -1) {
        allTodos[idx] = result.data;
        updateStats();
        renderTodos();
      }
    } else {
      showToast(result.error?.message || 'Failed to update task', 'error');
      fetchTodos();
    }
  } catch (err) {
    showToast('Failed to update task state', 'error');
    fetchTodos();
  }
}

// Delete todo
async function deleteTodo(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;

  try {
    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'DELETE',
    });

    const result = await res.json();
    if (res.ok && result.success) {
      allTodos = allTodos.filter(t => t._id !== id);
      updateStats();
      renderTodos();
      showToast('Task deleted successfully');
    } else {
      showToast(result.error?.message || 'Failed to delete task', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting task', 'error');
  }
}

// Filter tabs
filterTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    filterTabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTodos();
  });
});

// Initial boot
checkHealth();
fetchTodos();
setInterval(checkHealth, 10000);
