const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getSecrets } = require('../secrets');

const secrets = getSecrets();

/**
 * Record a page view.
 * POST /api/track/page
 * Body: { path: string, durationMs?: number }
 * If authenticated we capture user_id for unique-visitor stats; otherwise store null.
 */
router.post('/page', async (req, res) => {
  try {
    const { path, durationMs = 0 } = req.body;
    if (!path) return res.status(400).json({ error: 'Path is required' });

    const db = req.app.locals.db;

    // Attempt to extract user_id if Authorization header present
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, secrets.JWT_SECRET);
        userId = decoded.id;
      } catch (_) {
        // ignore invalid token – we still record anonymous view
      }
    }
    await db.query(
      'INSERT INTO page_views (user_id, path, duration_ms) VALUES ($1, $2, $3)',
      [userId, path, durationMs]
    );

    res.status(201).json({ message: 'Recorded' });
  } catch (error) {
    console.error('Error recording page view:', error);
    res.status(500).json({ error: 'Failed to record page view' });
  }
});

module.exports = router; 