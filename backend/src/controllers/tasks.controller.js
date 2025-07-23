const TasksRepository = require('../repositories/tasks.repository');

/**
 * Tasks Controller - Layer 3
 * Handles HTTP requests and responses for task operations
 * Contains all CRUD operations with proper status codes
 */
class TasksController {
    constructor() {
        this.tasksRepository = new TasksRepository();
    }

    /**
     * Get all tasks with pagination and filtering
     * GET /api/tasks
     */
    async getAllTasks(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                completed = null,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            // Parse and validate query parameters
            const options = {
                page: parseInt(page, 10),
                limit: Math.min(parseInt(limit, 10), 100), // Max 100 items per page
                search: search.trim(),
                completed: completed === null ? null : completed === 'true',
                sortBy,
                sortOrder
            };

            // Validate pagination parameters
            if (options.page < 1) options.page = 1;
            if (options.limit < 1) options.limit = 10;

            const result = await this.tasksRepository.getAllTasks(options);

            res.status(200).json({
                success: true,
                message: 'Tasks retrieved successfully',
                data: result.tasks,
                pagination: result.pagination
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve tasks',
                error: error.message
            });
        }
    }

    /**
     * Get task by ID
     * GET /api/tasks/:id
     */
    async getTaskById(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Task ID is required'
                });
            }

            const task = await this.tasksRepository.getTaskById(id);

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Task retrieved successfully',
                data: task
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve task',
                error: error.message
            });
        }
    }

    /**
     * Create new task
     * POST /api/tasks
     */
    async createTask(req, res) {
        try {
            const { text } = req.body;

            if (!text || typeof text !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Task text is required and must be a string'
                });
            }

            const taskData = {
                text: text.trim(),
                completed: req.body.completed || false
            };

            const createdTask = await this.tasksRepository.createTask(taskData);

            res.status(201).json({
                success: true,
                message: 'Task created successfully',
                data: createdTask
            });
        } catch (error) {
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({
                success: false,
                message: error.message,
                ...(error.details && { details: error.details })
            });
        }
    }

    /**
     * Update task (full update)
     * PUT /api/tasks/:id
     */
    async updateTask(req, res) {
        try {
            const { id } = req.params;
            const { text, completed } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Task ID is required'
                });
            }

            if (!text || typeof text !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Task text is required and must be a string'
                });
            }

            const updates = {
                text: text.trim(),
                completed: Boolean(completed)
            };

            const updatedTask = await this.tasksRepository.updateTask(id, updates);

            if (!updatedTask) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Task updated successfully',
                data: updatedTask
            });
        } catch (error) {
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({
                success: false,
                message: error.message,
                ...(error.details && { details: error.details })
            });
        }
    }

    /**
     * Partially update task
     * PATCH /api/tasks/:id
     */
    async patchTask(req, res) {
        try {
            const { id } = req.params;
            const updates = {};

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Task ID is required'
                });
            }

            // Only include provided fields
            if (req.body.text !== undefined) {
                if (typeof req.body.text !== 'string') {
                    return res.status(400).json({
                        success: false,
                        message: 'Task text must be a string'
                    });
                }
                updates.text = req.body.text.trim();
            }

            if (req.body.completed !== undefined) {
                updates.completed = Boolean(req.body.completed);
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one field (text or completed) must be provided'
                });
            }

            const updatedTask = await this.tasksRepository.updateTask(id, updates);

            if (!updatedTask) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Task updated successfully',
                data: updatedTask
            });
        } catch (error) {
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({
                success: false,
                message: error.message,
                ...(error.details && { details: error.details })
            });
        }
    }

    /**
     * Toggle task completion
     * PATCH /api/tasks/:id/toggle
     */
    async toggleTaskCompletion(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Task ID is required'
                });
            }

            const updatedTask = await this.tasksRepository.toggleTaskCompletion(id);

            if (!updatedTask) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Task completion status toggled successfully',
                data: updatedTask
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to toggle task completion',
                error: error.message
            });
        }
    }

    /**
     * Delete task
     * DELETE /api/tasks/:id
     */
    async deleteTask(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Task ID is required'
                });
            }

            const deleted = await this.tasksRepository.deleteTask(id);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Task deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to delete task',
                error: error.message
            });
        }
    }

    /**
     * Delete multiple tasks
     * DELETE /api/tasks
     */
    async deleteTasks(req, res) {
        try {
            const { ids } = req.body;

            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Array of task IDs is required'
                });
            }

            const result = await this.tasksRepository.deleteTasks(ids);

            res.status(200).json({
                success: true,
                message: `Deleted ${result.deletedCount} out of ${result.requestedCount} tasks`,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to delete tasks',
                error: error.message
            });
        }
    }

    /**
     * Delete all completed tasks
     * DELETE /api/tasks/completed
     */
    async deleteCompletedTasks(req, res) {
        try {
            const result = await this.tasksRepository.deleteCompletedTasks();

            res.status(200).json({
                success: true,
                message: result.message,
                data: { deletedCount: result.deletedCount }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to delete completed tasks',
                error: error.message
            });
        }
    }

    /**
     * Get task statistics
     * GET /api/tasks/stats
     */
    async getTaskStats(req, res) {
        try {
            const stats = await this.tasksRepository.getTaskStats();

            res.status(200).json({
                success: true,
                message: 'Task statistics retrieved successfully',
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve task statistics',
                error: error.message
            });
        }
    }

    /**
     * Search tasks
     * GET /api/tasks/search
     */
    async searchTasks(req, res) {
        try {
            const { q: searchTerm, ...otherOptions } = req.query;

            if (!searchTerm) {
                return res.status(400).json({
                    success: false,
                    message: 'Search term (q parameter) is required'
                });
            }

            const options = {
                page: parseInt(otherOptions.page, 10) || 1,
                limit: Math.min(parseInt(otherOptions.limit, 10) || 10, 100),
                completed: otherOptions.completed === null ? null : otherOptions.completed === 'true',
                sortBy: otherOptions.sortBy || 'createdAt',
                sortOrder: otherOptions.sortOrder || 'desc'
            };

            const result = await this.tasksRepository.searchTasks(searchTerm, options);

            res.status(200).json({
                success: true,
                message: 'Search completed successfully',
                data: result.tasks,
                pagination: result.pagination,
                searchTerm
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Search failed',
                error: error.message
            });
        }
    }
}

module.exports = TasksController;
