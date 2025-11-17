/**
 * Production-Ready Express Server for Email Writing Assistant
 * Proxy server for Claude API with security features
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for production
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Rate limiting (simple implementation)
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 20; // requests per window

function checkRateLimit(ip) {
    const now = Date.now();
    const userRequests = rateLimit.get(ip) || [];

    // Remove old requests outside the window
    const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);

    if (recentRequests.length >= MAX_REQUESTS) {
        return false;
    }

    recentRequests.push(now);
    rateLimit.set(ip, recentRequests);
    return true;
}

// Clean up rate limit map every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, requests] of rateLimit.entries()) {
        const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
        if (recentRequests.length === 0) {
            rateLimit.delete(ip);
        } else {
            rateLimit.set(ip, recentRequests);
        }
    }
}, 5 * 60 * 1000);

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Email Writer API is running',
        timestamp: new Date().toISOString()
    });
});

// API info endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Email Writing Assistant API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /health',
            generate: 'POST /api/generate'
        }
    });
});

// Proxy endpoint for Claude API
app.post('/api/generate', async (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress;

    // Rate limiting check
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({
            error: 'Too many requests. Please try again later.'
        });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // Validate prompt length (prevent abuse)
    if (prompt.length > 50000) {
        return res.status(400).json({
            error: 'Prompt is too long. Maximum 50,000 characters.'
        });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        console.error('ERROR: ANTHROPIC_API_KEY not configured');
        return res.status(500).json({
            error: 'API key not configured on server'
        });
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2000,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Anthropic API Error:', response.status, errorData);

            if (response.status === 429) {
                return res.status(429).json({
                    error: 'API rate limit reached. Please try again in a moment.',
                });
            }

            return res.status(response.status).json({
                error: errorData.error?.message || 'API request failed',
            });
        }

        const data = await response.json();

        if (data.content && data.content[0] && data.content[0].text) {
            return res.json({ text: data.content[0].text });
        }

        return res.status(500).json({ error: 'Unexpected API response format' });
    } catch (error) {
        console.error('Error calling Claude API:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Email Writer API running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});