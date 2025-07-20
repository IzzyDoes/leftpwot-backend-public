const express = require('express');
const router = express.Router();
const { authenticateToken, requireVerification, isAdmin } = require('../middleware/auth');

// Get all polls for a post
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id; // Optional user ID for checking if user voted

    const query = `
      SELECT 
        p.id,
        p.question,
        p.description,
        p.is_active,
        p.allow_multiple_votes,
        p.expires_at,
        p.created_at,
        p.updated_at,
        (
          SELECT json_agg(
            json_build_object(
              'id', po.id,
              'option_text', po.option_text,
              'vote_count', (
                SELECT COUNT(*) 
                FROM poll_votes pv 
                WHERE pv.poll_option_id = po.id
              ),
              'user_voted', CASE 
                WHEN $2 IS NOT NULL THEN (
                  SELECT COUNT(*) > 0 
                  FROM poll_votes pv2 
                  WHERE pv2.poll_option_id = po.id AND pv2.user_id = $2
                )
                ELSE false
              END
            )
          )
          FROM poll_options po 
          WHERE po.poll_id = p.id
        ) as options,
        (
          SELECT COUNT(DISTINCT pv.user_id) 
          FROM poll_votes pv 
          JOIN poll_options po ON pv.poll_option_id = po.id 
          WHERE po.poll_id = p.id
        ) as total_votes
      FROM polls p
      WHERE p.post_id = $1 AND p.is_active = true
      ORDER BY p.created_at DESC
    `;

    const result = await req.app.locals.db.query(query, [postId, userId]);
    
    res.json({
      polls: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ error: 'Error fetching polls' });
  }
});

// Get a single poll with detailed results
router.get('/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;
    const userId = req.user?.id;

    const query = `
      SELECT 
        p.id,
        p.question,
        p.description,
        p.is_active,
        p.allow_multiple_votes,
        p.expires_at,
        p.created_at,
        p.updated_at,
        (
          SELECT json_agg(
            json_build_object(
              'id', po.id,
              'option_text', po.option_text,
              'vote_count', (
                SELECT COUNT(*) 
                FROM poll_votes pv 
                WHERE pv.poll_option_id = po.id
              ),
              'percentage', CASE 
                WHEN (
                  SELECT COUNT(DISTINCT pv.user_id) 
                  FROM poll_votes pv 
                  JOIN poll_options po2 ON pv.poll_option_id = po2.id 
                  WHERE po2.poll_id = p.id
                ) > 0 THEN
                  ROUND(
                    (
                      SELECT COUNT(*) 
                      FROM poll_votes pv 
                      WHERE pv.poll_option_id = po.id
                    ) * 100.0 / (
                      SELECT COUNT(DISTINCT pv.user_id) 
                      FROM poll_votes pv 
                      JOIN poll_options po2 ON pv.poll_option_id = po2.id 
                      WHERE po2.poll_id = p.id
                    ), 1
                  )
                ELSE 0
              END,
              'user_voted', CASE 
                WHEN $2 IS NOT NULL THEN (
                  SELECT COUNT(*) > 0 
                  FROM poll_votes pv 
                  WHERE pv.poll_option_id = po.id AND pv.user_id = $2
                )
                ELSE false
              END
            )
          )
          FROM poll_options po 
          WHERE po.poll_id = p.id
        ) as options,
        (
          SELECT COUNT(DISTINCT pv.user_id) 
          FROM poll_votes pv 
          JOIN poll_options po ON pv.poll_option_id = po.id 
          WHERE po.poll_id = p.id
        ) as total_votes
      FROM polls p
      WHERE p.id = $1
    `;

    const result = await req.app.locals.db.query(query, [pollId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching poll:', error);
    res.status(500).json({ error: 'Error fetching poll' });
  }
});

// Create a new poll (authenticated users only)
router.post('/', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { postId, question, description, options, allowMultipleVotes = false, expiresAt } = req.body;
    const userId = req.user.id;
    const db = req.app.locals.db;

    // Validate required fields
    if (!postId || !question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ 
        error: 'Post ID, question, and at least 2 options are required' 
      });
    }

    // Check if post exists and belongs to user (or user is admin)
    const { rows: postRows } = await db.query(
      'SELECT user_id FROM posts WHERE id = $1',
      [postId]
    );

    if (postRows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user is admin or post owner
    const { rows: userRows } = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userRows[0].role !== 'admin' && postRows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Only post owners or admins can create polls' });
    }

    // Check if poll already exists for this post
    const { rows: existingPoll } = await db.query(
      'SELECT id FROM polls WHERE post_id = $1 AND is_active = true',
      [postId]
    );

    if (existingPoll.length > 0) {
      return res.status(400).json({ error: 'A poll already exists for this post' });
    }

    // Start transaction
    await db.query('BEGIN');

    try {
      // Create poll
      const pollResult = await db.query(
        `INSERT INTO polls (post_id, question, description, allow_multiple_votes, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id`,
        [postId, question, description, allowMultipleVotes, expiresAt]
      );

      const pollId = pollResult.rows[0].id;

      // Create poll options
      for (const option of options) {
        await db.query(
          'INSERT INTO poll_options (poll_id, option_text) VALUES ($1, $2)',
          [pollId, option]
        );
      }

      await db.query('COMMIT');

      // Return the created poll
      const createdPoll = await db.query(
        `SELECT 
          p.id,
          p.question,
          p.description,
          p.is_active,
          p.allow_multiple_votes,
          p.expires_at,
          p.created_at,
          (
            SELECT json_agg(
              json_build_object(
                'id', po.id,
                'option_text', po.option_text,
                'vote_count', 0,
                'percentage', 0,
                'user_voted', false
              )
            )
            FROM poll_options po 
            WHERE po.poll_id = p.id
          ) as options,
          0 as total_votes
        FROM polls p
        WHERE p.id = $1`,
        [pollId]
      );

      res.status(201).json(createdPoll.rows[0]);
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Error creating poll' });
  }
});

// Vote on a poll
router.post('/:pollId/vote', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionIds } = req.body; // Array of option IDs
    const userId = req.user.id;
    const db = req.app.locals.db;

    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
      return res.status(400).json({ error: 'At least one option ID is required' });
    }

    // Check if poll exists and is active
    const { rows: pollRows } = await db.query(
      'SELECT * FROM polls WHERE id = $1 AND is_active = true',
      [pollId]
    );

    if (pollRows.length === 0) {
      return res.status(404).json({ error: 'Poll not found or inactive' });
    }

    const poll = pollRows[0];

    // Check if poll has expired
    if (poll.expires_at && new Date() > new Date(poll.expires_at)) {
      return res.status(400).json({ error: 'Poll has expired' });
    }

    // Check if options belong to this poll
    const { rows: optionRows } = await db.query(
      'SELECT id FROM poll_options WHERE id = ANY($1) AND poll_id = $2',
      [optionIds, pollId]
    );

    if (optionRows.length !== optionIds.length) {
      return res.status(400).json({ error: 'Invalid option IDs' });
    }

    // Check if user has already voted (for single vote polls)
    if (!poll.allow_multiple_votes) {
      const { rows: existingVotes } = await db.query(
        'SELECT id FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
        [pollId, userId]
      );

      if (existingVotes.length > 0) {
        return res.status(400).json({ error: 'You have already voted on this poll' });
      }
    }

    // Start transaction
    await db.query('BEGIN');

    try {
      // Add votes
      for (const optionId of optionIds) {
        await db.query(
          'INSERT INTO poll_votes (poll_id, poll_option_id, user_id) VALUES ($1, $2, $3)',
          [pollId, optionId, userId]
        );
      }

      await db.query('COMMIT');

      // Return updated poll results
      const updatedPoll = await db.query(
        `SELECT 
          p.id,
          p.question,
          p.description,
          p.is_active,
          p.allow_multiple_votes,
          p.expires_at,
          p.created_at,
          p.updated_at,
          (
            SELECT json_agg(
              json_build_object(
                'id', po.id,
                'option_text', po.option_text,
                'vote_count', (
                  SELECT COUNT(*) 
                  FROM poll_votes pv 
                  WHERE pv.poll_option_id = po.id
                ),
                'percentage', CASE 
                  WHEN (
                    SELECT COUNT(DISTINCT pv.user_id) 
                    FROM poll_votes pv 
                    JOIN poll_options po2 ON pv.poll_option_id = po2.id 
                    WHERE po2.poll_id = p.id
                  ) > 0 THEN
                    ROUND(
                      (
                        SELECT COUNT(*) 
                        FROM poll_votes pv 
                        WHERE pv.poll_option_id = po.id
                      ) * 100.0 / (
                        SELECT COUNT(DISTINCT pv.user_id) 
                        FROM poll_votes pv 
                        JOIN poll_options po2 ON pv.poll_option_id = po2.id 
                        WHERE po2.poll_id = p.id
                      ), 1
                    )
                  ELSE 0
                END,
                'user_voted', (
                  SELECT COUNT(*) > 0 
                  FROM poll_votes pv 
                  WHERE pv.poll_option_id = po.id AND pv.user_id = $2
                )
              )
            )
            FROM poll_options po 
            WHERE po.poll_id = p.id
          ) as options,
          (
            SELECT COUNT(DISTINCT pv.user_id) 
            FROM poll_votes pv 
            JOIN poll_options po ON pv.poll_option_id = po.id 
            WHERE po.poll_id = p.id
          ) as total_votes
        FROM polls p
        WHERE p.id = $1`,
        [pollId, userId]
      );

      res.json(updatedPoll.rows[0]);
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error voting on poll:', error);
    res.status(500).json({ error: 'Error voting on poll' });
  }
});

// Update a poll (admin or poll creator only)
router.put('/:pollId', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { pollId } = req.params;
    const { question, description, isActive, allowMultipleVotes, expiresAt } = req.body;
    const userId = req.user.id;
    const db = req.app.locals.db;

    // Check if poll exists
    const { rows: pollRows } = await db.query(
      `SELECT p.*, po.post_id 
       FROM polls p 
       JOIN posts po ON p.post_id = po.id 
       WHERE p.id = $1`,
      [pollId]
    );

    if (pollRows.length === 0) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const poll = pollRows[0];

    // Check if user is admin or poll creator
    const { rows: userRows } = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userRows[0].role !== 'admin' && poll.post_id !== userId) {
      return res.status(403).json({ error: 'Only poll creators or admins can update polls' });
    }

    // Update poll
    const updateQuery = `
      UPDATE polls 
      SET question = COALESCE($1, question),
          description = COALESCE($2, description),
          is_active = COALESCE($3, is_active),
          allow_multiple_votes = COALESCE($4, allow_multiple_votes),
          expires_at = COALESCE($5, expires_at),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      question, description, isActive, allowMultipleVotes, expiresAt, pollId
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating poll:', error);
    res.status(500).json({ error: 'Error updating poll' });
  }
});

// Delete a poll (admin only)
router.delete('/:pollId', isAdmin, async (req, res) => {
  try {
    const { pollId } = req.params;
    const db = req.app.locals.db;

    // Check if poll exists
    const { rows } = await db.query('SELECT id FROM polls WHERE id = $1', [pollId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Delete poll (cascade will delete options and votes)
    await db.query('DELETE FROM polls WHERE id = $1', [pollId]);

    res.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    console.error('Error deleting poll:', error);
    res.status(500).json({ error: 'Error deleting poll' });
  }
});

// Get poll statistics (admin only)
router.get('/:pollId/stats', isAdmin, async (req, res) => {
  try {
    const { pollId } = req.params;
    const db = req.app.locals.db;

    const query = `
      SELECT 
        p.id,
        p.question,
        p.created_at,
        p.expires_at,
        (
          SELECT COUNT(DISTINCT pv.user_id) 
          FROM poll_votes pv 
          JOIN poll_options po ON pv.poll_option_id = po.id 
          WHERE po.poll_id = p.id
        ) as total_voters,
        (
          SELECT json_agg(
            json_build_object(
              'option_text', po.option_text,
              'vote_count', (
                SELECT COUNT(*) 
                FROM poll_votes pv 
                WHERE pv.poll_option_id = po.id
              ),
              'percentage', CASE 
                WHEN (
                  SELECT COUNT(DISTINCT pv.user_id) 
                  FROM poll_votes pv 
                  JOIN poll_options po2 ON pv.poll_option_id = po2.id 
                  WHERE po2.poll_id = p.id
                ) > 0 THEN
                  ROUND(
                    (
                      SELECT COUNT(*) 
                      FROM poll_votes pv 
                      WHERE pv.poll_option_id = po.id
                    ) * 100.0 / (
                      SELECT COUNT(DISTINCT pv.user_id) 
                      FROM poll_votes pv 
                      JOIN poll_options po2 ON pv.poll_option_id = po2.id 
                      WHERE po2.poll_id = p.id
                    ), 1
                  )
                ELSE 0
              END
            )
          )
          FROM poll_options po 
          WHERE po.poll_id = p.id
        ) as options
      FROM polls p
      WHERE p.id = $1
    `;

    const result = await db.query(query, [pollId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching poll stats:', error);
    res.status(500).json({ error: 'Error fetching poll statistics' });
  }
});

module.exports = router; 