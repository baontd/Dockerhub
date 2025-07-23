const express = require('express');
const cors = require('cors');

// Import routers và middleware
const tasksRouter = require('./routers/tasks.router');
const {
    requestLogger,
    corsMiddleware,
    errorHandler,
    notFoundHandler,
    timeoutMiddleware,
    securityHeaders
} = require('./middlewares/auth.middleware');

// Tạo Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Thiết lập middleware
app.use(securityHeaders);
app.use(timeoutMiddleware(30000));
app.use(cors());
app.use(corsMiddleware);
app.use(requestLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// API docs
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'TODO App API - 7-Layer MVC Architecture',
        version: '1.0.0',
        architecture: {
            layer1: 'Router Layer - HTTP endpoints and routing',
            layer2: 'Middleware Layer - Authentication, validation, rate limiting',
            layer3: 'Controller Layer - Request/response handling and business logic',
            layer4: 'Repository Layer - Data access abstraction',
            layer5: 'Model Layer - Data structure and validation',
            layer6: 'Datasource Layer - Database/filesystem operations',
            layer7: 'Entry Point - Application setup and configuration'
        },
        dataFlow: 'HTTP Request → Router → Middleware → Controller → Repository → Model → Datasource',
        endpoints: {
            health: 'GET /health',
            api_docs: 'GET /api',
            tasks_docs: 'GET /api/tasks/docs',
            tasks: 'GET /api/tasks'
        },
        features: [
            'Full CRUD operations',
            'Pagination and filtering',
            'Search functionality',
            'Task statistics',
            'Bulk operations',
            'Input validation',
            'Error handling',
            'Rate limiting',
            'CORS support',
            'Security headers',
            'Request logging',
            'File-based storage'
        ]
    });
});

// Mount routes
app.use('/api/tasks', tasksRouter);

// 404 và error handler
app.use('/api/*', notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
    console.log('');
    console.log('🚀 TODO App Server Started!');
    console.log('');
    console.log(`🔗 API Docs: http://localhost:${PORT}/api`);
    console.log(`📋 Tasks API: http://localhost:${PORT}/api/tasks`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log('');
    console.log('📁 Architecture: 7-Layer MVC');
    console.log('💾 Storage: File System');
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('');
});

// Shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM received, shutting down...');
    server.close(() => {
        console.log('✅ Server closed.');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received, shutting down...');
    server.close(() => {
        console.log('✅ Server closed.');
        process.exit(0);
    });
});
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = app;
