const Task = require('../models/task.model');
const FileDatasource = require('../datasources/file.datasource');

/**
 * Tasks Repository - Layer 4
 * Handles data access with business logic for tasks
 * Acts as a bridge between controllers and datasource
 */
class TasksRepository {
    constructor() {
        this.datasource = new FileDatasource();
    }

    /**
     * Get all tasks with pagination and filtering
     * @param {Object} options - Query options
     * @returns {Object} Paginated task results
     */
    async getAllTasks(options = {}) {
        try {
            const result = await this.datasource.findWithPagination(options);
            
            // Convert plain objects to Task instances
            const tasks = Task.fromJSONArray(result.tasks);
            
            return {
                tasks: tasks.map(task => task.toJSON()),
                pagination: result.pagination
            };
        } catch (error) {
            throw new Error(`Failed to get tasks: ${error.message}`);
        }
    }

    /**
     * Get task by ID
     * @param {string} id - Task ID
     * @returns {Object|null} Task object or null
     */
    async getTaskById(id) {
        try {
            if (!id) {
                throw new Error('Task ID is required');
            }

            const taskData = await this.datasource.findById(id);
            if (!taskData) {
                return null;
            }

            const task = Task.fromJSON(taskData);
            return task.toJSON();
        } catch (error) {
            throw new Error(`Failed to get task: ${error.message}`);
        }
    }

    /**
     * Create a new task
     * @param {Object} taskData - Task data
     * @returns {Object} Created task
     */
    async createTask(taskData) {
        try {
            // Create and validate task
            const task = new Task(taskData);
            const validation = task.validate();
            
            if (!validation.isValid) {
                const error = new Error('Validation failed');
                error.details = validation.errors;
                error.statusCode = 400;
                throw error;
            }

            // Check for duplicate text
            const existingTasks = await this.datasource.readAll();
            const duplicateExists = existingTasks.some(
                existing => existing.text.toLowerCase().trim() === task.text.toLowerCase().trim()
            );

            if (duplicateExists) {
                const error = new Error('Task with this text already exists');
                error.statusCode = 409;
                throw error;
            }

            // Save to datasource
            const createdTask = await this.datasource.create(task.toJSON());
            return createdTask;
        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            throw new Error(`Failed to create task: ${error.message}`);
        }
    }

    /**
     * Update task by ID
     * @param {string} id - Task ID
     * @param {Object} updates - Updates to apply
     * @returns {Object|null} Updated task or null
     */
    async updateTask(id, updates) {
        try {
            if (!id) {
                throw new Error('Task ID is required');
            }

            // Get existing task
            const existingTaskData = await this.datasource.findById(id);
            if (!existingTaskData) {
                return null;
            }

            // Create task instance and apply updates
            const task = Task.fromJSON(existingTaskData);
            task.update(updates);

            // Validate updated task
            const validation = task.validate();
            if (!validation.isValid) {
                const error = new Error('Validation failed');
                error.details = validation.errors;
                error.statusCode = 400;
                throw error;
            }

            // Check for duplicate text (excluding current task)
            if (updates.text) {
                const existingTasks = await this.datasource.readAll();
                const duplicateExists = existingTasks.some(
                    existing => existing.id !== id && 
                    existing.text.toLowerCase().trim() === task.text.toLowerCase().trim()
                );

                if (duplicateExists) {
                    const error = new Error('Task with this text already exists');
                    error.statusCode = 409;
                    throw error;
                }
            }

            // Update in datasource
            const updatedTask = await this.datasource.updateById(id, task.toJSON());
            return updatedTask;
        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            throw new Error(`Failed to update task: ${error.message}`);
        }
    }

    /**
     * Delete task by ID
     * @param {string} id - Task ID
     * @returns {boolean} True if deleted, false if not found
     */
    async deleteTask(id) {
        try {
            if (!id) {
                throw new Error('Task ID is required');
            }

            return await this.datasource.deleteById(id);
        } catch (error) {
            throw new Error(`Failed to delete task: ${error.message}`);
        }
    }

    /**
     * Toggle task completion status
     * @param {string} id - Task ID
     * @returns {Object|null} Updated task or null
     */
    async toggleTaskCompletion(id) {
        try {
            if (!id) {
                throw new Error('Task ID is required');
            }

            // Get existing task
            const existingTaskData = await this.datasource.findById(id);
            if (!existingTaskData) {
                return null;
            }

            // Toggle completion
            const task = Task.fromJSON(existingTaskData);
            if (task.completed) {
                task.markIncomplete();
            } else {
                task.markCompleted();
            }

            // Update in datasource
            const updatedTask = await this.datasource.updateById(id, task.toJSON());
            return updatedTask;
        } catch (error) {
            throw new Error(`Failed to toggle task completion: ${error.message}`);
        }
    }

    /**
     * Delete multiple tasks
     * @param {Array} ids - Array of task IDs
     * @returns {Object} Deletion result
     */
    async deleteTasks(ids) {
        try {
            if (!Array.isArray(ids) || ids.length === 0) {
                throw new Error('Task IDs array is required');
            }

            const deletedCount = await this.datasource.deleteMany(ids);
            return {
                deletedCount,
                requestedCount: ids.length
            };
        } catch (error) {
            throw new Error(`Failed to delete tasks: ${error.message}`);
        }
    }

    /**
     * Delete all completed tasks
     * @returns {Object} Deletion result
     */
    async deleteCompletedTasks() {
        try {
            const allTasks = await this.datasource.readAll();
            const completedTaskIds = allTasks
                .filter(task => task.completed)
                .map(task => task.id);

            if (completedTaskIds.length === 0) {
                return {
                    deletedCount: 0,
                    message: 'No completed tasks found'
                };
            }

            const deletedCount = await this.datasource.deleteMany(completedTaskIds);
            return {
                deletedCount,
                message: `Deleted ${deletedCount} completed tasks`
            };
        } catch (error) {
            throw new Error(`Failed to delete completed tasks: ${error.message}`);
        }
    }

    /**
     * Get task statistics
     * @returns {Object} Task statistics
     */
    async getTaskStats() {
        try {
            return await this.datasource.getStats();
        } catch (error) {
            throw new Error(`Failed to get task statistics: ${error.message}`);
        }
    }

    /**
     * Search tasks by text
     * @param {string} searchTerm - Search term
     * @param {Object} options - Additional options
     * @returns {Object} Search results
     */
    async searchTasks(searchTerm, options = {}) {
        try {
            if (!searchTerm || typeof searchTerm !== 'string') {
                throw new Error('Search term is required');
            }

            const searchOptions = {
                ...options,
                search: searchTerm.trim()
            };

            return await this.getAllTasks(searchOptions);
        } catch (error) {
            throw new Error(`Failed to search tasks: ${error.message}`);
        }
    }
}

module.exports = TasksRepository;
