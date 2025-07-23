/**
 * Authentication Middleware - Layer 2
 * Currently a placeholder for future authentication features
 * Can be extended to include JWT validation, API key validation, etc.
 */

/**
 * Basic request logging middleware
 */
const requestLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    console.log(`[${timestamp}] ${method} ${url} - ${userAgent}`);
    next();
};

/**
 * CORS middleware (simple implementation)
 */
const corsMiddleware = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
};

/**
 * Request validation middleware
 */
const validateRequest = (req, res, next) => {
    // Basic request validation
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        if (req.get('Content-Type') && !req.get('Content-Type').includes('application/json')) {
            return res.status(400).json({
                success: false,
                message: 'Content-Type must be application/json'
            });
        }
    }
    
    next();
};

/**
 * Rate limiting middleware (basic implementation)
 */
const createRateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const clientId = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean up old entries
        if (requests.has(clientId)) {
            const clientRequests = requests.get(clientId);
            const validRequests = clientRequests.filter(timestamp => timestamp > windowStart);
            requests.set(clientId, validRequests);
        }
        
        // Get current request count
        const clientRequests = requests.get(clientId) || [];
        
        if (clientRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
        
        // Add current request
        clientRequests.push(now);
        requests.set(clientId, clientRequests);
        
        next();
    };
};

/**
 * Error handling middleware
 */
const errorHandler = (error, req, res, next) => {
    console.error(`[ERROR] ${new Date().toISOString()}:`, error);
    
    // Default error response
    let statusCode = 500;
    let message = 'Internal server error';
    
    // Handle specific error types
    if (error.statusCode) {
        statusCode = error.statusCode;
        message = error.message;
    } else if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
    } else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    }
    
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};

/**
 * 404 handler middleware
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
};

/**
 * Request timeout middleware
 */
const timeoutMiddleware = (timeoutMs = 30000) => {
    return (req, res, next) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    success: false,
                    message: 'Request timeout'
                });
            }
        }, timeoutMs);
        
        // Clear timeout when response is finished
        res.on('finish', () => {
            clearTimeout(timeout);
        });
        
        next();
    };
};

/**
 * Request size limiter middleware
 */
const requestSizeLimiter = (maxSize = '10mb') => {
    return (req, res, next) => {
        const contentLength = req.get('Content-Length');
        
        if (contentLength) {
            const sizeInBytes = parseInt(contentLength, 10);
            const maxSizeInBytes = parseSize(maxSize);
            
            if (sizeInBytes > maxSizeInBytes) {
                return res.status(413).json({
                    success: false,
                    message: 'Request entity too large'
                });
            }
        }
        
        next();
    };
};

/**
 * Helper function to parse size string
 */
const parseSize = (sizeStr) => {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i);
    if (!match) return 0;
    
    const size = parseFloat(match[1]);
    const unit = (match[2] || '').toLowerCase();
    
    switch (unit) {
        case 'kb': return size * 1024;
        case 'mb': return size * 1024 * 1024;
        case 'gb': return size * 1024 * 1024 * 1024;
        default: return size;
    }
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
};

module.exports = {
    requestLogger,
    corsMiddleware,
    validateRequest,
    createRateLimiter,
    errorHandler,
    notFoundHandler,
    timeoutMiddleware,
    requestSizeLimiter,
    securityHeaders
};
