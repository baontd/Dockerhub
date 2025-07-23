// TODO App Class - Manages all todo functionality with backend integration
class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.editingId = null;
        this.apiBaseUrl = 'http://localhost:3000/api/tasks';

        
        // DOM elements
        this.todoForm = document.getElementById('todoForm');
        this.todoInput = document.getElementById('todoInput');
        this.todoList = document.getElementById('todoList');
        this.totalCount = document.getElementById('totalCount');
        this.completedCount = document.getElementById('completedCount');
        this.clearCompletedBtn = document.getElementById('clearCompletedBtn');
        this.emptyState = document.getElementById('emptyState');
        this.filterBtns = document.querySelectorAll('.todo-filters__btn');
        
        this.init();
    }
    
    async init() {
        await this.loadTodos();
        this.bindEvents();
        this.render();
    }
    
    // API Helper Methods
    async apiRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            this.showErrorMessage(error.message);
            throw error;
        }
    }
    
    async loadTodos() {
        try {
            const response = await this.apiRequest(`${this.apiBaseUrl}?limit=100`);
            this.todos = response.data || [];
            return this.todos;
        } catch (error) {
            console.warn('Failed to load todos from server, falling back to localStorage');
            this.loadFromStorage();
        }
    }
    
    // Event listeners
    bindEvents() {
        // Form submission
        this.todoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addTodo();
        });
        
        // Clear completed todos
        this.clearCompletedBtn.addEventListener('click', async () => {
            await this.clearCompleted();
        });
        
        // Filter buttons
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to add todo
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                this.todoInput.focus();
            }
            
            // Escape to cancel editing
            if (e.key === 'Escape' && this.editingId) {
                this.cancelEdit();
            }
        });
    }
    
    // Add new todo
    async addTodo() {
        const text = this.todoInput.value.trim();
        
        // Input validation
        if (!text) {
            this.showInputError('Please enter a todo item');
            return;
        }
        
        if (text.length > 100) {
            this.showInputError('Todo must be less than 100 characters');
            return;
        }
        
        try {
            const response = await this.apiRequest(this.apiBaseUrl, {
                method: 'POST',
                body: JSON.stringify({
                    text: text,
                    completed: false
                })
            });
            
            // Add priority detection for frontend display
            const newTodo = {
                ...response.data,
                priority: this.detectPriority(text)
            };
            
            this.todos.unshift(newTodo);
            this.todoInput.value = '';
            this.render();
            this.showSuccessMessage('Todo added successfully!');
            
        } catch (error) {
            console.error('Failed to add todo:', error);
        }
    }
    
    // Detect priority based on keywords (original feature)
    detectPriority(text) {
        const urgentKeywords = ['urgent', 'asap', 'important', 'critical', '!!!', 'emergency'];
        const highKeywords = ['high', 'priority', '!!', 'soon'];
        
        const lowerText = text.toLowerCase();
        
        if (urgentKeywords.some(keyword => lowerText.includes(keyword))) {
            return 'urgent';
        } else if (highKeywords.some(keyword => lowerText.includes(keyword))) {
            return 'high';
        }
        return 'normal';
    }
    
    // Toggle todo completion
    async toggleTodo(id) {
        try {
            const response = await this.apiRequest(`${this.apiBaseUrl}/${id}/toggle`, {
                method: 'PATCH'
            });
            
            // Update local todo
            const todoIndex = this.todos.findIndex(t => t.id === id);
            if (todoIndex !== -1) {
                this.todos[todoIndex] = {
                    ...response.data,
                    priority: this.todos[todoIndex].priority || this.detectPriority(response.data.text)
                };
                
                // Celebration animation for completion
                if (response.data.completed) {
                    this.showCelebration();
                }
                
                this.render();
            }
        } catch (error) {
            console.error('Failed to toggle todo:', error);
        }
    }
    
    // Delete todo with animation
    async deleteTodo(id) {
        const todoElement = document.querySelector(`[data-id="${id}"]`);
        if (todoElement) {
            todoElement.classList.add('removing');
            
            prompt('Are you sure you want to delete this todo?');

            setTimeout(async () => {
                try {
                    await this.apiRequest(`${this.apiBaseUrl}/${id}`, {
                        method: 'DELETE'
                    });
                    
                    this.todos = this.todos.filter(t => t.id !== id);
                    this.render();
                } catch (error) {
                    console.error('Failed to delete todo:', error);
                    todoElement.classList.remove('removing');
                }
            }, 300);
        }
    }
    
    // Start editing todo
    startEdit(id) {
        this.editingId = id;
        this.render();
        
        // Focus the edit input
        setTimeout(() => {
            const editInput = document.querySelector('.todo-item__edit-input');
            if (editInput) {
                editInput.focus();
                editInput.select();
            }
        }, 50);
    }
    
    // Save edit
    async saveEdit(id, newText) {
        const text = newText.trim();
        
        if (!text) {
            await this.deleteTodo(id);
            return;
        }
        
        try {
            const response = await this.apiRequest(`${this.apiBaseUrl}/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ text })
            });
            
            // Update local todo
            const todoIndex = this.todos.findIndex(t => t.id === id);
            if (todoIndex !== -1) {
                this.todos[todoIndex] = {
                    ...response.data,
                    priority: this.detectPriority(text)
                };
            }
            
            this.editingId = null;
            this.render();
        } catch (error) {
            console.error('Failed to update todo:', error);
            this.editingId = null;
            this.render();
        }
    }
    
    // Cancel edit
    cancelEdit() {
        this.editingId = null;
        this.render();
    }
    
    // Clear all completed todos
    async clearCompleted() {
        const completedCount = this.todos.filter(t => t.completed).length;
        
        if (completedCount === 0) return;
        
        if (confirm(`Are you sure you want to delete ${completedCount} completed todo${completedCount > 1 ? 's' : ''}?`)) {
            try {
                await this.apiRequest(`${this.apiBaseUrl}/completed`, {
                    method: 'DELETE'
                });
                
                this.todos = this.todos.filter(t => !t.completed);
                this.render();
                this.showSuccessMessage(`${completedCount} completed todo${completedCount > 1 ? 's' : ''} cleared!`);
            } catch (error) {
                console.error('Failed to clear completed todos:', error);
            }
        }
    }
    
    // Set filter
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        this.filterBtns.forEach(btn => {
            btn.classList.toggle('todo-filters__btn--active', btn.dataset.filter === filter);
        });
        
        this.render();
    }
    
    // Get filtered todos
    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(t => !t.completed);
            case 'completed':
                return this.todos.filter(t => t.completed);
            default:
                return this.todos;
        }
    }
    
    // Sort todos by priority and date
    sortTodos(todos) {
        const priorityOrder = { urgent: 3, high: 2, normal: 1 };
        
        return todos.sort((a, b) => {
            // Completed todos go to bottom
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            // Sort by priority, then by creation date
            const aPriority = a.priority || this.detectPriority(a.text);
            const bPriority = b.priority || this.detectPriority(b.text);
            
            if (aPriority !== bPriority) {
                return priorityOrder[bPriority] - priorityOrder[aPriority];
            }
            
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }
    
    // Create todo item element
    createTodoElement(todo) {
        const li = document.createElement('li');
        const priority = todo.priority || this.detectPriority(todo.text);
        
        // Use BEM class names
        let classes = ['todo-list__item'];
        if (todo.completed) classes.push('todo-list__item--completed');
        if (priority === 'urgent') classes.push('todo-list__item--priority-urgent');
        if (priority === 'high') classes.push('todo-list__item--priority-high');
        
        li.className = classes.join(' ');
        li.dataset.id = todo.id;
        
        if (this.editingId === todo.id) {
            li.innerHTML = `
                <div class="todo-item__checkbox ${todo.completed ? 'todo-item__checkbox--checked' : ''}"></div>
                <input type="text" class="todo-item__edit-input" value="${this.escapeHtml(todo.text)}" maxlength="100">
                <div class="todo-item__actions">
                    <button class="todo-item__btn todo-item__btn--save" title="Save">💾</button>
                    <button class="todo-item__btn todo-item__btn--cancel" title="Cancel">❌</button>
                </div>
            `;
            
            // Edit mode event listeners
            const editInput = li.querySelector('.todo-item__edit-input');
            const saveBtn = li.querySelector('.todo-item__btn--save');
            const cancelBtn = li.querySelector('.todo-item__btn--cancel');
            
            editInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.saveEdit(todo.id, editInput.value);
                } else if (e.key === 'Escape') {
                    this.cancelEdit();
                }
            });
            
            saveBtn.addEventListener('click', () => {
                this.saveEdit(todo.id, editInput.value);
            });
            
            cancelBtn.addEventListener('click', () => {
                this.cancelEdit();
            });
        } else {
            const priorityIcon = this.getPriorityIcon(priority);
            
            li.innerHTML = `
                <div class="todo-item__checkbox ${todo.completed ? 'todo-item__checkbox--checked' : ''}"></div>
                <span class="todo-item__text">${priorityIcon}${this.escapeHtml(todo.text)}</span>
                <div class="todo-item__actions">
                    <button class="todo-item__btn todo-item__btn--edit" title="Edit">✏️</button>
                    <button class="todo-item__btn todo-item__btn--delete" title="Delete">🗑️</button>
                </div>
            `;
            
            // Event listeners
            const checkbox = li.querySelector('.todo-item__checkbox');
            const editBtn = li.querySelector('.todo-item__btn--edit');
            const deleteBtn = li.querySelector('.todo-item__btn--delete');
            
            checkbox.addEventListener('click', () => {
                this.toggleTodo(todo.id);
            });
            
            editBtn.addEventListener('click', () => {
                this.startEdit(todo.id);
            });
            
            deleteBtn.addEventListener('click', () => {
                this.deleteTodo(todo.id);
            });
        }
        
        return li;
    }
    
    // Get priority icon
    getPriorityIcon(priority) {
        switch (priority) {
            case 'urgent':
                return '🔥 ';
            case 'high':
                return '⚠️ ';
            default:
                return '';
        }
    }
    
    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Update statistics
    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        
        this.totalCount.textContent = total;
        this.completedCount.textContent = completed;
        
        // Enable/disable clear completed button
        this.clearCompletedBtn.disabled = completed === 0;
    }
    
    // Show/hide empty state
    updateEmptyState() {
        const filteredTodos = this.getFilteredTodos();
        const hasVisibleTodos = filteredTodos.length > 0;
        
        this.emptyState.classList.toggle('empty-state--hidden', hasVisibleTodos);
        this.todoList.style.display = hasVisibleTodos ? 'block' : 'none';
    }
    
    // Main render function
    render() {
        // Clear the list
        this.todoList.innerHTML = '';
        
        // Get and sort filtered todos
        const filteredTodos = this.getFilteredTodos();
        const sortedTodos = this.sortTodos([...filteredTodos]);
        
        // Create and append todo elements
        sortedTodos.forEach(todo => {
            const todoElement = this.createTodoElement(todo);
            this.todoList.appendChild(todoElement);
        });
        
        // Update UI elements
        this.updateStats();
        this.updateEmptyState();
    }
    
    // Show input error
    showInputError(message) {
        this.todoInput.style.borderColor = '#ef4444';
        this.todoInput.setAttribute('placeholder', message);
        
        setTimeout(() => {
            this.todoInput.style.borderColor = '';
            this.todoInput.setAttribute('placeholder', 'What needs to be done?');
        }, 3000);
    }
    
    // Show success message
    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #22c55e;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
        `;
        
        // Add animation styles
        if (!document.querySelector('#success-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'success-animation-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => successDiv.remove(), 300);
        }, 2000);
    }
    
    // Show error message
    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => errorDiv.remove(), 300);
        }, 3000);
    }
    
    // Show celebration animation
    showCelebration() {
        const celebration = document.createElement('div');
        celebration.innerHTML = '🎉';
        celebration.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 4rem;
            z-index: 1000;
            pointer-events: none;
            animation: celebrate 1s ease-out forwards;
        `;
        
        // Add celebration animation
        if (!document.querySelector('#celebration-styles')) {
            const style = document.createElement('style');
            style.id = 'celebration-styles';
            style.textContent = `
                @keyframes celebrate {
                    0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
                    50% { transform: translate(-50%, -50%) scale(1.2) rotate(180deg); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(0) rotate(360deg); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(celebration);
        setTimeout(() => celebration.remove(), 1000);
    }
    
    // Fallback localStorage functions (for offline mode)
    saveToStorage() {
        try {
            localStorage.setItem('todoApp', JSON.stringify({
                todos: this.todos,
                currentFilter: this.currentFilter
            }));
        } catch (error) {
            console.warn('Could not save to localStorage:', error);
        }
    }
    
    loadFromStorage() {
        try {
            const data = localStorage.getItem('todoApp');
            if (data) {
                const parsed = JSON.parse(data);
                this.todos = parsed.todos || [];
                this.currentFilter = parsed.currentFilter || 'all';
                
                // Update filter UI
                this.filterBtns.forEach(btn => {
                    btn.classList.toggle('todo-filters__btn--active', btn.dataset.filter === this.currentFilter);
                });
            }
        } catch (error) {
            console.warn('Could not load from localStorage:', error);
            this.todos = [];
        }
    }
    
    // Export todos functionality
    async exportTodos() {
        try {
            const response = await this.apiRequest(`${this.apiBaseUrl}?limit=1000`);
            const data = {
                todos: response.data,
                exportedAt: new Date().toISOString(),
                version: '2.0'
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showSuccessMessage('Todos exported successfully!');
        } catch (error) {
            console.error('Failed to export todos:', error);
        }
    }
    
    // Import todos functionality
    async importTodos(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.todos && Array.isArray(data.todos)) {
                    let importedCount = 0;
                    
                    for (const todoData of data.todos) {
                        try {
                            await this.apiRequest(this.apiBaseUrl, {
                                method: 'POST',
                                body: JSON.stringify({
                                    text: todoData.text,
                                    completed: todoData.completed || false
                                })
                            });
                            importedCount++;
                        } catch (error) {
                            // Skip duplicates or invalid todos
                            console.warn('Skipped todo:', todoData.text, error.message);
                        }
                    }
                    
                    // Reload todos from server
                    await this.loadTodos();
                    this.render();
                    this.showSuccessMessage(`Imported ${importedCount} new todos!`);
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (error) {
                this.showErrorMessage('Error importing file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.todoApp = new TodoApp();
    
    // Add export/import buttons to the UI
    const headerActions = document.createElement('div');
    headerActions.className = 'app-header__actions';
    headerActions.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        gap: 10px;
    `;
    
    headerActions.innerHTML = `
        <button class="app-header__btn" id="exportBtn" title="Export Todos">📤</button>
        <button class="app-header__btn" id="importBtn" title="Import Todos">📥</button>
        <input type="file" id="importFile" accept=".json" style="display: none;">
    `;
    
    // Add header action styles
    const headerStyle = document.createElement('style');
    headerStyle.textContent = `
        .app-header__btn {
            width: 40px;
            height: 40px;
            border: none;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        .app-header__btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
    `;
    document.head.appendChild(headerStyle);
    
    document.querySelector('.app-header').appendChild(headerActions);
    
    // Export/Import event listeners
    document.getElementById('exportBtn').addEventListener('click', () => {
        window.todoApp.exportTodos();
    });
    
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    
    document.getElementById('importFile').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            window.todoApp.importTodos(e.target.files[0]);
            e.target.value = '';
        }
    });
});
