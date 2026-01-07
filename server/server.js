import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit'; // Security #3
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = 3001;

// API Configuration
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

// Debug: Log API configuration on startup (mask API key for security)
const apiKeyMasked = process.env.OPENAI_API_KEY
    ? `${process.env.OPENAI_API_KEY.substring(0, 8)}...${process.env.OPENAI_API_KEY.slice(-4)}`
    : 'NOT SET';
console.log(`[Config] OPENAI_BASE_URL: ${OPENAI_BASE_URL}`);
console.log(`[Config] OPENAI_API_KEY: ${apiKeyMasked}`);

// Security #3: Trust Proxy (Required for Rate Limiting behind reverse proxies)
app.set('trust proxy', 1);

// Security #60: Restrict CORS
const allowedOrigins = ['http://localhost:5173', 'http://localhost:4173'];
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));
app.use(express.json({ limit: '10mb' }));

// Security #3: Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs (Generous for dev/beta)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

// Middleware: Request Logger
app.use((req, res, next) => {
    const start = Date.now();
    const { method, url } = req;

    // Log immediately
    console.log(`[${new Date().toISOString()}] -> Incoming: ${method} ${url}`);

    // Intercept response finish to log status and duration
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] <- Completed: ${method} ${url} ${res.statusCode} - ${duration}ms`);
    });

    next();
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// Middleware to check for API KEY in server environment
app.use((req, res, next) => {
    if (!process.env.OPENAI_API_KEY) {
        // In production, this should likely be a fatal error or strictly logged
        const msg = 'Fatal: OPENAI_API_KEY is not set in server environment.';
        console.error(msg);
        if (process.env.NODE_ENV === 'production') {
            return res.status(500).json({ error: 'Server Misconfiguration' });
        }
    }
    next();
});

// Proxy endpoint for Chat Completions
app.post('/api/chat/completions', async (req, res) => {
    // Stability #2: Abort Controller for Billing Safety
    const controller = new AbortController();

    // Listen for client disconnect
    req.on('close', () => {
        controller.abort();
    });

    try {
        const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify(req.body),
            signal: controller.signal // Pass signal to upstream
        });

        console.log(`[Proxy] Upstream Response: ${response.status}`); // Debug

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown upstream error' }));
            console.error('[Proxy] Upstream Error:', errorData); // Debug
            return res.status(response.status).json(errorData);
        }

        // Streaming support
        if (req.body.stream && response.body) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // Iterate over the Web Stream
            for await (const chunk of response.body) {
                res.write(chunk);
            }
            res.end();
            console.log(`[Proxy] Stream Completed: ${req.url}`);
        } else {
            console.log('[Proxy] Non-streaming response'); // Debug
            const data = await response.json();
            res.json(data);
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Client aborted request');
            return; // Silent return on abort
        }
        console.error('Proxy Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// Proxy endpoint for Embeddings
app.post('/api/embeddings', async (req, res) => {
    // Stability #2: Abort Controller support
    const controller = new AbortController();
    req.on('close', () => controller.abort());

    try {
        const response = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify(req.body),
            signal: controller.signal
        });

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Proxy Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.join(__dirname, '../dist');

    app.use(express.static(distPath));

    // Handle React routing, return all requests to React app
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// Health Check for Kubernetes/Docker (#14)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`BFF (Backend for Frontend) Server running on http://0.0.0.0:${PORT}`);
});
