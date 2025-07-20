const { getSecrets } = require('./secrets');
const secrets = getSecrets();

/* ── ADD THIS BLOCK (build Redis URL from secret if missing) ───────────────── */
if (!secrets.REDIS_URL) {
  const pass = secrets.REDIS_PASSWORD;         // read from /run/secrets/redis_password
  const host = 'redis_enterprise';             // service name in docker-compose
  const port = 12001;                          // exposed Redis port
  if (pass) {
    secrets.REDIS_URL = `redis://default:${pass}@${host}:${port}`;
  }
}
/* ───────────────────────────────────────────────────────────────────────────── */

if (secrets.NODE_ENV === 'test') {
  require('dotenv').config({ path: '.env.test' });
} else {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const Redis = require('redis');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const logger = require('./logger');
const reportsRoutes = require('./routes/reports');
const helmet = require('helmet');
const trackRoutes = require('./routes/track');
const pollsRoutes = require('./routes/polls');

// Initialize Express app
const app = express();

// Trust proxy for rate limiting behind reverse proxy/load balancer
app.set('trust proxy', 1);

const PORT = secrets.PORT;

// Initialize Redis client (optional - only if REDIS_URL is provided)
let redisClient = null;
if (secrets.REDIS_URL) {
  try {
    redisClient = Redis.createClient({
      url: secrets.REDIS_URL,
      legacyMode: true 
    });

    redisClient.on('error', (err) => console.error('Redis Client Error:', err));
    redisClient.connect().catch(console.error);
  } catch (error) {
    console.warn('Failed to initialize Redis client:', error.message);
    redisClient = null;
  }
} else {
  console.warn('REDIS_URL not provided - Redis caching will be disabled');
}

// Make Redis client available to routes
app.locals.redis = redisClient;

// Middleware
app.use(cors());
app.use(compression()); // Enable compression
app.use(express.json());
app.use(helmet());

// Rate limiting (skip in development / test)
if (secrets.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);
}

// Database connection
const pool = new Pool({
  host: secrets.DB_HOST,
  user: secrets.DB_USER,
  database: secrets.DB_NAME,
  password: secrets.DB_PASSWORD,
  port: secrets.DB_PORT,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
});

// Test database connection
pool.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Database connection error:', err));

// Make the pool available to routes
app.locals.db = pool;

// Cache middleware
const cache = (duration) => {
  return async (req, res, next) => {
    // Skip caching if Redis is not available
    if (!redisClient) {
      return next();
    }
    
    // Only cache GET requests with NO Authorization header (public, not user-specific)
    if (req.method !== 'GET' || req.headers.authorization) {
      return next();
    }
    const key = `cache:${req.originalUrl}`;
    try {
      const cachedResponse = await redisClient.get(key);
      if (cachedResponse) {
        return res.json(JSON.parse(cachedResponse));
      }
      // Store original res.json
      const originalJson = res.json;
      res.json = function(body) {
        redisClient.setEx(key, duration, JSON.stringify(body));
        return originalJson.call(this, body);
      };
      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};

// Apply caching to routes
app.use('/api/posts', cache(300)); // Cache for 5 minutes
app.use('/api/comments', cache(300));

// Routes
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/polls', pollsRoutes);

// Page-view tracking
app.use('/api/track', trackRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('LeftPlot API is running');
});

// Request logging middleware (no sensitive data)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    let level = 'info';
    if (res.statusCode >= 500) level = 'error';
    else if (res.statusCode >= 400) level = 'warn';
    logger.log({ level, message: `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms` });
  });
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} ${res.statusCode || 500} - ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Something broke!' });
});

// Start server only if not required by another module (e.g., for tests)
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the API at:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://<your-local-ip>:${PORT}`);
  });
}

module.exports = app;
