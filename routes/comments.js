const express = require('express');
const router = express.Router();
const { authenticateToken, requireVerification } = require('../middleware/auth');

// Get comments for a post with pagination and userVoteType
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const db = req.app.locals.db;
    const userId = req.user?.id; // Make userId optional

    const query = `
      SELECT c.*, u.username,
        ${userId ? `(SELECT vote_type FROM comment_votes WHERE comment_id = c.id AND user_id = $1) AS user_vote_type` : 'NULL AS user_vote_type'}
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ${userId ? '$2' : '$1'}
       ORDER BY c.upvotes DESC, c.created_at DESC
       LIMIT ${userId ? '$3' : '$2'} OFFSET ${userId ? '$4' : '$3'}
    `;

    const params = userId ? [userId, postId, limit, offset] : [postId, limit, offset];
    const { rows } = await db.query(query, params);

    // Get total count for pagination
    const { rows: countRows } = await db.query(
      'SELECT COUNT(*) FROM comments WHERE post_id = $1',
      [postId]
    );

    const totalComments = parseInt(countRows[0].count);
    const totalPages = Math.ceil(totalComments / limit);

    res.json({
      comments: rows.map(c => ({
        ...c,
        userVoteType: c.user_vote_type // 'upvote', 'downvote', or null
      })),
      pagination: {
        total: totalComments,
        pages: totalPages,
        current: parseInt(page)
      }
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({ error: 'Failed to retrieve comments' });
  }
});

// Helper to check if user is blocked
async function checkBlockedUser(db, userId) {
  const { rows } = await db.query('SELECT blocked FROM users WHERE id = $1', [userId]);
  if (rows.length === 0) return false;
  return rows[0].blocked;
}

// Add a new comment to a post
router.post('/', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { postId, content } = req.body;
    const userId = req.user.id;
    const db = req.app.locals.db;

    // Check if user is blocked
    if (await checkBlockedUser(db, userId)) {
      return res.status(403).json({ error: 'Your account has been blocked' });
    }

    // Check if user is admin
    const { rows: userRows } = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (userRows[0].role === 'admin') {
      return res.status(403).json({ error: 'Admins are not allowed to comment' });
    }

    if (!content || !postId) {
      return res.status(400).json({ error: 'Comment content and post ID are required' });
    }

    if (content.length > 200) {
      return res.status(400).json({ error: 'Comment cannot exceed 200 characters' });
    }

    // Check if post exists and is not blocked
    const { rows: postCheck } = await db.query(
      'SELECT id, blocked FROM posts WHERE id = $1',
      [postId]
    );

    if (postCheck.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (postCheck[0].blocked) {
      return res.status(403).json({ error: 'This post is blocked' });
    }
    
    const { rows } = await db.query(
      `INSERT INTO comments (post_id, user_id, content, created_at, upvotes, downvotes)
       VALUES ($1, $2, $3, NOW(), 0, 0)
       RETURNING *`,
      [postId, userId, content]
    );
    
    // Get username for the new comment
    const { rows: userNameRows } = await db.query(
      'SELECT username FROM users WHERE id = $1',
      [userId]
    );
    
    res.status(201).json({
      ...rows[0],
      username: userNameRows[0].username
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Delete a comment
router.delete('/:id', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const db = req.app.locals.db;
    const redis = req.app.locals.redis;
    // Get post_id before deleting
    const { rows: commentRows } = await db.query('SELECT post_id FROM comments WHERE id = $1', [id]);
    if (commentRows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    const postId = commentRows[0].post_id;
    // Check if user owns the comment or is admin
    const { rows: checkRows } = await db.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [id]
    );
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    // Check if user is comment owner or admin
    const { rows: userRows } = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    const isAdmin = userRows[0].role === 'admin';
    if (checkRows[0].user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }
    await db.query('DELETE FROM comments WHERE id = $1', [id]);
    // Invalidate comments cache for the post
    if (redis) {
      await redis.del(`cache:/api/comments/post/${postId}`);
    }
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Upvote a comment
router.post('/:id/upvote', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const db = req.app.locals.db;

    // Check if user is blocked
    if (await checkBlockedUser(db, userId)) {
      return res.status(403).json({ error: 'Your account has been blocked' });
    }

    // Check if comment exists and its post is not blocked
    const { rows: commentRows } = await db.query(
      'SELECT c.id, p.blocked FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.id = $1',
      [id]
    );
    if (commentRows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    if (commentRows[0].blocked) return res.status(403).json({ error: 'This post is blocked' });

    // Check if user has already voted on this comment
    const { rows: voteCheck } = await db.query(
      'SELECT * FROM comment_votes WHERE comment_id = $1 AND user_id = $2',
      [id, userId]
    );

    // Begin transaction
    await db.query('BEGIN');

    if (voteCheck.length > 0) {
      const existingVote = voteCheck[0];
      
      if (existingVote.vote_type === 'upvote') {
        // Already upvoted, remove the vote
        await db.query(
          'DELETE FROM comment_votes WHERE comment_id = $1 AND user_id = $2',
          [id, userId]
        );
        
        await db.query(
          'UPDATE comments SET upvotes = upvotes - 1 WHERE id = $1',
          [id]
        );
      } else {
        // Change downvote to upvote
        await db.query(
          'UPDATE comment_votes SET vote_type = $1 WHERE comment_id = $2 AND user_id = $3',
          ['upvote', id, userId]
        );
        
        await db.query(
          'UPDATE comments SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = $1',
          [id]
        );
      }
    } else {
      // New vote
      await db.query(
        'INSERT INTO comment_votes (comment_id, user_id, vote_type) VALUES ($1, $2, $3)',
        [id, userId, 'upvote']
      );
      
      await db.query(
        'UPDATE comments SET upvotes = upvotes + 1 WHERE id = $1',
        [id]
      );
    }

    // Commit transaction
    await db.query('COMMIT');

    // Get updated comment with userVoteType
    const { rows } = await db.query(
      `SELECT c.*, u.username,
        (SELECT vote_type FROM comment_votes WHERE comment_id = c.id AND user_id = $2) AS user_vote_type
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [id, userId]
    );

    res.json({
      ...rows[0],
      userVoteType: rows[0].user_vote_type // 'upvote', 'downvote', or null
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error upvoting comment:', error);
    res.status(500).json({ error: 'Failed to upvote comment' });
  }
});

// Downvote a comment
router.post('/:id/downvote', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const db = req.app.locals.db;

    // Check if user is blocked
    if (await checkBlockedUser(db, userId)) {
      return res.status(403).json({ error: 'Your account has been blocked' });
    }

    // Check if comment exists and its post is not blocked
    const { rows: commentRows } = await db.query(
      'SELECT c.id, p.blocked FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.id = $1',
      [id]
    );
    if (commentRows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    if (commentRows[0].blocked) return res.status(403).json({ error: 'This post is blocked' });

    // Check if user has already voted on this comment
    const { rows: voteCheck } = await db.query(
      'SELECT * FROM comment_votes WHERE comment_id = $1 AND user_id = $2',
      [id, userId]
    );

    // Begin transaction
    await db.query('BEGIN');

    if (voteCheck.length > 0) {
      const existingVote = voteCheck[0];
      
      if (existingVote.vote_type === 'downvote') {
        // Already downvoted, remove the vote
        await db.query(
          'DELETE FROM comment_votes WHERE comment_id = $1 AND user_id = $2',
          [id, userId]
        );
        
        await db.query(
          'UPDATE comments SET downvotes = downvotes - 1 WHERE id = $1',
          [id]
        );
      } else {
        // Change upvote to downvote
        await db.query(
          'UPDATE comment_votes SET vote_type = $1 WHERE comment_id = $2 AND user_id = $3',
          ['downvote', id, userId]
        );
        
        await db.query(
          'UPDATE comments SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = $1',
          [id]
        );
      }
    } else {
      // New vote
      await db.query(
        'INSERT INTO comment_votes (comment_id, user_id, vote_type) VALUES ($1, $2, $3)',
        [id, userId, 'downvote']
      );
      
      await db.query(
        'UPDATE comments SET downvotes = downvotes + 1 WHERE id = $1',
        [id]
      );
    }

    // Commit transaction
    await db.query('COMMIT');

    // Get updated comment with userVoteType
    const { rows } = await db.query(
      `SELECT c.*, u.username,
        (SELECT vote_type FROM comment_votes WHERE comment_id = c.id AND user_id = $2) AS user_vote_type
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [id, userId]
    );

    res.json({
      ...rows[0],
      userVoteType: rows[0].user_vote_type // 'upvote', 'downvote', or null
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error downvoting comment:', error);
    res.status(500).json({ error: 'Failed to downvote comment' });
  }
});

module.exports = router;