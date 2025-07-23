const fs = require('fs').promises;
const path = require('path');

/**
 * File Datasource - Layer 6
 * Handles filesystem operations for task data
 * This layer can be easily replaced with database implementations
 */
class FileDatasource {
    constructor() {
        this.dataDir = path.join(__dirname, '../../data');
        this.tasksFile = path.join(this.dataDir, 'tasks.json');
        this.initialized = false;
    }

    /**
     * Initialize datasource - create data directory and file if needed
     */
    async init() {
        if (this.initialized) return;

        try {
            // Create data directory if it doesn't exist
            await fs.mkdir(this.dataDir, { recursive: true });
            
            // Check if tasks file exists, if not create it with empty array
            try {
                await fs.access(this.tasksFile);
            } catch (error) {
                await fs.writeFile(this.tasksFile, JSON.stringify([], null, 2));
            }
            
            this.initialized = true;
        } catch (error) {
            throw new Error(`Failed to initialize file datasource: ${error.message}`);
        }
    }

    /**
     * Read all tasks from file
     * @returns {Array} Array of task objects
     */
    async readAll() {
        await this.init();
        
        try {
            const data = await fs.readFile(this.tasksFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw new Error(`Failed to read tasks: ${error.message}`);
        }
    }

    /**
     * Write all tasks to file
     * @param {Array} tasks - Array of task objects
     */
    async writeAll(tasks) {
        await this.init();
        
        try {
            await fs.writeFile(this.tasksFile, JSON.stringify(tasks, null, 2));
        } catch (error) {
            throw new Error(`Failed to write tasks: ${error.message}`);
        }
    }

    /**
     * Find task by ID
     * @param {string} id - Task ID
     * @returns {Object|null} Task object or null if not found
     */
    async findById(id) {
        const tasks = await this.readAll();
        return tasks.find(task => task.id === id) || null;
    }

    /**
     * Create a new task
     * @param {Object} taskData - Task data
     * @returns {Object} Created task
     */
    async create(taskData) {
        const tasks = await this.readAll();
        tasks.push(taskData);
        await this.writeAll(tasks);
        return taskData;
    }

    /**
     * Update task by ID
     * @param {string} id - Task ID
     * @param {Object} updates - Updates to apply
     * @returns {Object|null} Updated task or null if not found
     */
    async updateById(id, updates) {
        const tasks = await this.readAll();
        const index = tasks.findIndex(task => task.id === id);
        
        if (index === -1) {
            return null;
        }
        
        tasks[index] = { ...tasks[index], ...updates };
        await this.writeAll(tasks);
        return tasks[index];
    }

    /**
     * Delete task by ID
     * @param {string} id - Task ID
     * @returns {boolean} True if deleted, false if not found
     */
    async deleteById(id) {
        const tasks = await this.readAll();
        const index = tasks.findIndex(task => task.id === id);
        
        if (index === -1) {
            return false;
        }
        
        tasks.splice(index, 1);
        await this.writeAll(tasks);
        return true;
    }

    /**
     * Get tasks with pagination and filtering
     * @param {Object} options - Query options
     * @param {number} options.page - Page number (1-based)
     * @param {number} options.limit - Items per page
     * @param {string} options.search - Search term
     * @param {boolean} options.completed - Filter by completion status
     * @param {string} options.sortBy - Sort field (createdAt, updatedAt, text)
     * @param {string} options.sortOrder - Sort order (asc, desc)
     * @returns {Object} Paginated results
     */
    async findWithPagination(options = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            completed = null,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options;

        let tasks = await this.readAll();

        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            tasks = tasks.filter(task => 
                task.text.toLowerCase().includes(searchLower)
            );
        }

        // Apply completion filter
        if (completed !== null) {
            tasks = tasks.filter(task => task.completed === completed);
        }

        // Apply sorting
        tasks.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];

            // Handle different data types
            if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            } else if (sortBy === 'text') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        // Calculate pagination
        const total = tasks.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedTasks = tasks.slice(offset, offset + limit);

        return {
            tasks: paginatedTasks,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    /**
     * Delete multiple tasks
     * @param {Array} ids - Array of task IDs
     * @returns {number} Number of deleted tasks
     */
    async deleteMany(ids) {
        const tasks = await this.readAll();
        const initialLength = tasks.length;
        
        const filteredTasks = tasks.filter(task => !ids.includes(task.id));
        await this.writeAll(filteredTasks);
        
        return initialLength - filteredTasks.length;
    }

    /**
     * Get statistics
     * @returns {Object} Task statistics
     */
    async getStats() {
        const tasks = await this.readAll();
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        const pending = total - completed;

        return {
            total,
            completed,
            pending,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }
}

module.exports = FileDatasource;
