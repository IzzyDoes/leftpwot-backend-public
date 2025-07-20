const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// User submits a report
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, targetId, reason } = req.body;
    const reporterId = req.user.id;
    const db = req.app.locals.db;

    if (!type || !['post', 'comment'].includes(type)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }
    if (!targetId || !reason) {
      return res.status(400).json({ error: 'targetId and reason are required' });
    }

    let details = null;
    if (type === 'comment') {
      // Snapshot the comment content
      const { rows } = await db.query('SELECT content FROM comments WHERE id = $1', [targetId]);
      if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
      details = rows[0].content;
    }
    if (type === 'post') {
      // Optionally snapshot post title/content
      const { rows } = await db.query('SELECT title, content FROM posts WHERE id = $1', [targetId]);
      if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
      details = rows[0].title + '\n' + rows[0].content;
    }

    const { rowCount } = await db.query(
      `INSERT INTO reports (type, target_id, reporter_id, reason, details, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       ON CONFLICT (type, target_id, reporter_id) DO NOTHING`,
      [type, targetId, reporterId, reason, details]
    );

    if (rowCount === 0) {
      return res.status(400).json({ error: 'You have already reported this content' });
    }

    res.status(201).json({ message: 'Report submitted' });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router; 