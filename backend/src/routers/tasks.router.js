const express = require('express');
const TasksController = require('../controllers/tasks.controller');
const { 
    validateRequest, 
    createRateLimiter,
    requestSizeLimiter 
} = require('../middlewares/auth.middleware');

/**
 * Tasks Router - Layer 1
 * Defines all CRUD endpoints with appropriate HTTP methods
 * Routes: GET (read), POST (create), PUT (full update), PATCH (partial update), DELETE (remove)
 */

// Create router instance
const router = express.Router();

// Create controller instance
const tasksController = new TasksController();

// Apply middleware to all routes
router.use(validateRequest);
router.use(createRateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes
router.use(requestSizeLimiter('1mb')); // Limit request size to 1MB

/**
 * GET /api/tasks/stats
 * Get task statistics
 */
router.get('/stats', async (req, res) => {
    await tasksController.getTaskStats(req, res);
});

/**
 * GET /api/tasks/search
 * Search tasks by text
 * Query params: q (search term), page, limit, completed, sortBy, sortOrder
 */
router.get('/search', async (req, res) => {
    await tasksController.searchTasks(req, res);
});

/**
 * DELETE /api/tasks/completed
 * Delete all completed tasks
 */
router.delete('/completed', async (req, res) => {
    await tasksController.deleteCompletedTasks(req, res);
});

/**
 * GET /api/tasks
 * Get all tasks with pagination and filtering
 * Query params: page, limit, search, completed, sortBy, sortOrder
 */
router.get('/', async (req, res) => {
    await tasksController.getAllTasks(req, res);
});

/**
 * POST /api/tasks
 * Create a new task
 * Body: { text: string, completed?: boolean }
 */
router.post('/', async (req, res) => {
    await tasksController.createTask(req, res);
});

/**
 * DELETE /api/tasks
 * Delete multiple tasks
 * Body: { ids: string[] }
 */
router.delete('/', async (req, res) => {
    await tasksController.deleteTasks(req, res);
});

/**
 * GET /api/tasks/:id
 * Get task by ID
 */
router.get('/:id', async (req, res) => {
    await tasksController.getTaskById(req, res);
});

/**
 * PUT /api/tasks/:id
 * Update task (full update - requires all fields)
 * Body: { text: string, completed: boolean }
 */
router.put('/:id', async (req, res) => {
    await tasksController.updateTask(req, res);
});

/**
 * PATCH /api/tasks/:id
 * Partially update task (only provided fields)
 * Body: { text?: string, completed?: boolean }
 */
router.patch('/:id', async (req, res) => {
    await tasksController.patchTask(req, res);
});

/**
 * PATCH /api/tasks/:id/toggle
 * Toggle task completion status
 */
router.patch('/:id/toggle', async (req, res) => {
    await tasksController.toggleTaskCompletion(req, res);
});

/**
 * DELETE /api/tasks/:id
 * Delete task by ID
 */
router.delete('/:id', async (req, res) => {
    await tasksController.deleteTask(req, res);
});

// Route documentation endpoint
router.get('/docs', (req, res) => {
    res.json({
        success: true,
        message: 'TODO API Documentation',
        endpoints: {
            'GET /api/tasks': {
                description: 'Get all tasks with pagination and filtering',
                queryParams: {
                    page: 'Page number (default: 1)',
                    limit: 'Items per page (default: 10, max: 100)',
                    search: 'Search term for task text',
                    completed: 'Filter by completion status (true/false)',
                    sortBy: 'Sort field (createdAt, updatedAt, text)',
                    sortOrder: 'Sort order (asc, desc)'
                }
            },
            'GET /api/tasks/:id': {
                description: 'Get task by ID',
                params: {
                    id: 'Task ID (UUID)'
                }
            },
            'POST /api/tasks': {
                description: 'Create a new task',
                body: {
                    text: 'Task text (required, string, max 100 chars)',
                    completed: 'Completion status (optional, boolean, default: false)'
                }
            },
            'PUT /api/tasks/:id': {
                description: 'Update task (full update)',
                params: {
                    id: 'Task ID (UUID)'
                },
                body: {
                    text: 'Task text (required, string, max 100 chars)',
                    completed: 'Completion status (required, boolean)'
                }
            },
            'PATCH /api/tasks/:id': {
                description: 'Partially update task',
                params: {
                    id: 'Task ID (UUID)'
                },
                body: {
                    text: 'Task text (optional, string, max 100 chars)',
                    completed: 'Completion status (optional, boolean)'
                }
            },
            'PATCH /api/tasks/:id/toggle': {
                description: 'Toggle task completion status',
                params: {
                    id: 'Task ID (UUID)'
                }
            },
            'DELETE /api/tasks/:id': {
                description: 'Delete task by ID',
                params: {
                    id: 'Task ID (UUID)'
                }
            },
            'DELETE /api/tasks': {
                description: 'Delete multiple tasks',
                body: {
                    ids: 'Array of task IDs (required, string[])'
                }
            },
            'DELETE /api/tasks/completed': {
                description: 'Delete all completed tasks'
            },
            'GET /api/tasks/stats': {
                description: 'Get task statistics',
                response: {
                    total: 'Total number of tasks',
                    completed: 'Number of completed tasks',
                    pending: 'Number of pending tasks',
                    completionRate: 'Completion rate percentage'
                }
            },
            'GET /api/tasks/search': {
                description: 'Search tasks by text',
                queryParams: {
                    q: 'Search term (required)',
                    page: 'Page number (default: 1)',
                    limit: 'Items per page (default: 10, max: 100)',
                    completed: 'Filter by completion status (true/false)',
                    sortBy: 'Sort field (createdAt, updatedAt, text)',
                    sortOrder: 'Sort order (asc, desc)'
                }
            }
        },
        examples: {
            createTask: {
                method: 'POST',
                url: '/api/tasks',
                body: {
                    text: 'Learn Node.js',
                    completed: false
                }
            },
            updateTask: {
                method: 'PATCH',
                url: '/api/tasks/123e4567-e89b-12d3-a456-426614174000',
                body: {
                    completed: true
                }
            },
            searchTasks: {
                method: 'GET',
                url: '/api/tasks/search?q=nodejs&completed=false&page=1&limit=10'
            }
        }
    });
});

module.exports = router;
