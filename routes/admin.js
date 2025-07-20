const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');

// Real analytics endpoint
router.get('/analytics', isAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [users, posts, activeUsers, blockedUsers] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM posts'),
      db.query("SELECT COUNT(*) FROM users WHERE blocked = false"),
      db.query("SELECT COUNT(*) FROM users WHERE blocked = true")
    ]);
    // Reports count
    const { rows: reportRows } = await db.query('SELECT COUNT(*) FROM reports');
    const reports = parseInt(reportRows[0].count);

    // Page-view metrics (may be empty if table not populated yet)
    const { rows: pvRows } = await db.query(`
      SELECT
        COUNT(*)                      AS total_views,
        COUNT(DISTINCT user_id)       AS unique_users,
        COALESCE(AVG(duration_ms),0) AS avg_time_ms
      FROM page_views`);

    const pageViews = {
      total:       parseInt(pvRows[0].total_views || 0),
      uniqueUsers: parseInt(pvRows[0].unique_users || 0),
      avgTimeMs:   parseFloat(pvRows[0].avg_time_ms || 0)
    };

    res.json({
      totalUsers:   parseInt(users.rows[0].count),
      totalPosts:   parseInt(posts.rows[0].count),
      activeUsers:  parseInt(activeUsers.rows[0].count),
      blockedUsers: parseInt(blockedUsers.rows[0].count),
      reports,
      pageViews
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// --- Reports System ---

// Get all reports (with joined info)
router.get('/reports', isAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { rows } = await db.query(`
      SELECT
        r.id,
        r.type,
        r.target_id,
        CASE WHEN r.type = 'post' THEN p.title ELSE c.content END AS target,
        r.reason,
        u.username AS reported_by,
        r.created_at AS date,
        r.status
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      LEFT JOIN posts p ON r.type = 'post' AND r.target_id = p.id
      LEFT JOIN comments c ON r.type = 'comment' AND r.target_id = c.id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Mark report as resolved
router.patch('/reports/:id/resolve', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    await db.query(
      `UPDATE reports SET status = 'resolved', resolved_at = NOW() WHERE id = $1`,
      [id]
    );
    res.json({ message: 'Report marked as resolved' });
  } catch (error) {
    console.error('Error resolving report:', error);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
});

// Mark report as ignored
router.patch('/reports/:id/ignore', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    await db.query(
      `UPDATE reports SET status = 'ignored', ignored_at = NOW() WHERE id = $1`,
      [id]
    );
    res.json({ message: 'Report marked as ignored' });
  } catch (error) {
    console.error('Error ignoring report:', error);
    res.status(500).json({ error: 'Failed to ignore report' });
  }
});

// Delete a report (admin only)
router.delete('/reports/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const { rowCount } = await db.query('DELETE FROM reports WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

module.exports = router; 