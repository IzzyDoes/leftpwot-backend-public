const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin, requireVerification } = require('../middleware/auth');
const { generateUniqueSlug } = require('../utils/slugGenerator');

// Get all posts with pagination and sorting
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 5, sort = 'recent' } = req.query;
    const parsedLimit = parseInt(limit);
    const offset = (page - 1) * parsedLimit;

    // Build the base query
    let query = `
      WITH post_stats AS (
        SELECT 
          p.id,
          COUNT(DISTINCT c.id) as comment_count,
          COUNT(DISTINCT CASE WHEN pv.vote_type = 'upvote' THEN pv.id END) as upvotes,
          COUNT(DISTINCT CASE WHEN pv.vote_type = 'downvote' THEN pv.id END) as downvotes
        FROM posts p
        LEFT JOIN comments c ON p.id = c.post_id
        LEFT JOIN post_votes pv ON p.id = pv.post_id
        GROUP BY p.id
      )
      SELECT 
        p.*,
        u.username,
        ps.comment_count,
        ps.upvotes,
        ps.downvotes,
        (
          SELECT json_agg(comment_data)
          FROM (
            SELECT 
              c.id,
              c.content,
              cu.username,
              c.created_at,
              (
                SELECT COUNT(*) FROM comment_votes cv 
                WHERE cv.comment_id = c.id AND cv.vote_type = 'up'
              ) as upvotes,
              (
                SELECT COUNT(*) FROM comment_votes cv 
                WHERE cv.comment_id = c.id AND cv.vote_type = 'down'
              ) as downvotes
            FROM comments c
            JOIN users cu ON c.user_id = cu.id
            WHERE c.post_id = p.id
            ORDER BY c.created_at DESC
            LIMIT 3
          ) comment_data
        ) as comments,
        (
          SELECT json_agg(poll_data)
          FROM (
            SELECT 
              poll.id,
              poll.question,
              poll.description,
              poll.is_active,
              poll.allow_multiple_votes,
              poll.expires_at,
              poll.created_at,
              (
                SELECT COUNT(DISTINCT pv.user_id) 
                FROM poll_votes pv 
                JOIN poll_options po ON pv.poll_option_id = po.id 
                WHERE po.poll_id = poll.id
              ) as total_votes
            FROM polls poll
            WHERE poll.post_id = p.id AND poll.is_active = true
            ORDER BY poll.created_at DESC
            LIMIT 1
          ) poll_data
        ) as polls
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN post_stats ps ON p.id = ps.id
    `;

    // Add sorting
    switch (sort) {
      case 'popular':
        query += ' ORDER BY (ps.upvotes - ps.downvotes) DESC, p.created_at DESC';
        break;
      case 'comments':
        query += ' ORDER BY ps.comment_count DESC, p.created_at DESC';
        break;
      default: // recent
        query += ' ORDER BY p.created_at DESC';
    }

    // Add pagination
    query += ' LIMIT $1 OFFSET $2';

    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) FROM posts';
    const countResult = await req.app.locals.db.query(countQuery);
    const totalPosts = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalPosts / parsedLimit);

    // Execute the main query
    const result = await req.app.locals.db.query(query, [parsedLimit, offset]);

    res.json({
      posts: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts,
        postsPerPage: parsedLimit
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Error fetching posts' });
  }
});

// Get a single post by ID or slug
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = req.app.locals.db;
    
    // Check if identifier is a number (ID) or string (slug)
    const isNumeric = !isNaN(identifier) && !isNaN(parseFloat(identifier));
    
    let query;
    let params;
    
    if (isNumeric) {
      // Search by ID
      query = `
        WITH post_stats AS (
          SELECT 
            p.id,
            COUNT(DISTINCT c.id) as comment_count,
            COUNT(DISTINCT CASE WHEN pv.vote_type = 'upvote' THEN pv.id END) as upvotes,
            COUNT(DISTINCT CASE WHEN pv.vote_type = 'downvote' THEN pv.id END) as downvotes
          FROM posts p
          LEFT JOIN comments c ON p.id = c.post_id
          LEFT JOIN post_votes pv ON p.id = pv.post_id
          WHERE p.id = $1
          GROUP BY p.id
        )
        SELECT 
          p.*,
          u.username,
          ps.comment_count,
          ps.upvotes,
          ps.downvotes,
          (
            SELECT json_agg(comment_data)
            FROM (
              SELECT 
                c.id,
                c.content,
                cu.username,
                c.created_at,
                (
                  SELECT COUNT(*) FROM comment_votes cv 
                  WHERE cv.comment_id = c.id AND cv.vote_type = 'up'
                ) as upvotes,
                (
                  SELECT COUNT(*) FROM comment_votes cv 
                  WHERE cv.comment_id = c.id AND cv.vote_type = 'down'
                ) as downvotes
              FROM comments c
              JOIN users cu ON c.user_id = cu.id
              WHERE c.post_id = p.id
              ORDER BY c.created_at DESC
            ) comment_data
          ) as comments,
          (
            SELECT json_agg(poll_data)
            FROM (
              SELECT 
                poll.id,
                poll.question,
                poll.description,
                poll.is_active,
                poll.allow_multiple_votes,
                poll.expires_at,
                poll.created_at,
                (
                  SELECT COUNT(DISTINCT pv.user_id) 
                  FROM poll_votes pv 
                  JOIN poll_options po ON pv.poll_option_id = po.id 
                  WHERE po.poll_id = poll.id
                ) as total_votes
              FROM polls poll
              WHERE poll.post_id = p.id AND poll.is_active = true
              ORDER BY poll.created_at DESC
            ) poll_data
          ) as polls
         FROM posts p
         JOIN users u ON p.user_id = u.id
        JOIN post_stats ps ON p.id = ps.id
        WHERE p.id = $1
      `;
      params = [identifier];
    } else {
      // Search by slug
      query = `
        WITH post_stats AS (
          SELECT 
            p.id,
            COUNT(DISTINCT c.id) as comment_count,
            COUNT(DISTINCT CASE WHEN pv.vote_type = 'upvote' THEN pv.id END) as upvotes,
            COUNT(DISTINCT CASE WHEN pv.vote_type = 'downvote' THEN pv.id END) as downvotes
          FROM posts p
          LEFT JOIN comments c ON p.id = c.post_id
          LEFT JOIN post_votes pv ON p.id = pv.post_id
          WHERE p.slug = $1
          GROUP BY p.id
        )
        SELECT 
          p.*,
          u.username,
          ps.comment_count,
          ps.upvotes,
          ps.downvotes,
          (
            SELECT json_agg(comment_data)
            FROM (
              SELECT 
                c.id,
                c.content,
                cu.username,
                c.created_at,
                (
                  SELECT COUNT(*) FROM comment_votes cv 
                  WHERE cv.comment_id = c.id AND cv.vote_type = 'up'
                ) as upvotes,
                (
                  SELECT COUNT(*) FROM comment_votes cv 
                  WHERE cv.comment_id = c.id AND cv.vote_type = 'down'
                ) as downvotes
              FROM comments c
              JOIN users cu ON c.user_id = cu.id
              WHERE c.post_id = p.id
              ORDER BY c.created_at DESC
            ) comment_data
          ) as comments,
          (
            SELECT json_agg(poll_data)
            FROM (
              SELECT 
                poll.id,
                poll.question,
                poll.description,
                poll.is_active,
                poll.allow_multiple_votes,
                poll.expires_at,
                poll.created_at,
                (
                  SELECT COUNT(DISTINCT pv.user_id) 
                  FROM poll_votes pv 
                  JOIN poll_options po ON pv.poll_option_id = po.id 
                  WHERE po.poll_id = poll.id
                ) as total_votes
              FROM polls poll
              WHERE poll.post_id = p.id AND poll.is_active = true
              ORDER BY poll.created_at DESC
            ) poll_data
          ) as polls
         FROM posts p
         JOIN users u ON p.user_id = u.id
        JOIN post_stats ps ON p.id = ps.id
        WHERE p.slug = $1
      `;
      params = [identifier];
    }

    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Error fetching post' });
  }
});

// Helper to check if user is blocked
async function checkBlockedUser(db, userId) {
  const { rows } = await db.query('SELECT blocked FROM users WHERE id = $1', [userId]);
  if (rows.length === 0) return false;
  return rows[0].blocked;
}

// Create a new post
router.post('/', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { title, content } = req.body;
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
      return res.status(403).json({ error: 'Admins are not allowed to create posts' });
    }

    // Generate unique slug
    const baseSlug = generateUniqueSlug(title);
    
    // Check for existing slugs and generate unique one
    const { rows: existingSlugs } = await db.query(
      'SELECT slug FROM posts WHERE slug LIKE $1',
      [`${baseSlug}%`]
    );
    
    const existingSlugValues = existingSlugs.map(row => row.slug);
    const uniqueSlug = generateUniqueSlug(title, existingSlugValues);

    const query = `
      INSERT INTO posts (title, slug, content, user_id, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    const result = await db.query(query, [title, uniqueSlug, content, userId]);
    
    // Invalidate posts cache
    const redis = req.app.locals.redis;
    if (redis) {
      await redis.del('cache:/api/posts');
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Error creating post' });
  }
});

// Update a post
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;
    
    // First check if the post exists and belongs to the user
    const checkQuery = 'SELECT * FROM posts WHERE id = $1 AND user_id = $2';
    const checkResult = await req.app.locals.db.query(checkQuery, [id, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }
    
    const updateQuery = `
      UPDATE posts
      SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
      RETURNING *
    `;

    const result = await req.app.locals.db.query(updateQuery, [title, content, id, userId]);
    
    // Invalidate posts cache
    const redis = req.app.locals.redis;
    await redis.del('cache:/api/posts');
    await redis.del(`cache:/api/posts/${id}`);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Error updating post' });
  }
});

// Delete a post (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const redis = req.app.locals.redis;
    const { rows } = await db.query('DELETE FROM posts WHERE id = $1 RETURNING id', [id]);
    // Invalidate posts cache
    await redis.del('cache:/api/posts');
    await redis.del(`cache:/api/posts/${id}`);
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Upvote a post
router.post('/:id/upvote', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const db = req.app.locals.db;
  try {
    // Check if user is blocked
    if (await checkBlockedUser(db, userId)) {
      return res.status(403).json({ error: 'Your account has been blocked' });
    }
    // Check if post is blocked
    const { rows: postRows } = await db.query('SELECT blocked FROM posts WHERE id = $1', [id]);
    if (postRows.length === 0) return res.status(404).json({ error: 'Post not found' });
    if (postRows[0].blocked) return res.status(403).json({ error: 'This post is blocked' });
    // Check if user has already voted
    const { rows: existing } = await db.query(
      'SELECT * FROM post_votes WHERE post_id = $1 AND user_id = $2',
      [id, userId]
    );
    await db.query('BEGIN');
    if (existing.length > 0) {
      if (existing[0].vote_type === 'upvote') {
        // Remove upvote
        await db.query('DELETE FROM post_votes WHERE post_id = $1 AND user_id = $2', [id, userId]);
        await db.query('UPDATE posts SET upvotes = upvotes - 1 WHERE id = $1', [id]);
      } else {
        // Change downvote to upvote
        await db.query('UPDATE post_votes SET vote_type = $1 WHERE post_id = $2 AND user_id = $3', ['upvote', id, userId]);
        await db.query('UPDATE posts SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = $1', [id]);
      }
    } else {
      // New upvote
      await db.query('INSERT INTO post_votes (post_id, user_id, vote_type) VALUES ($1, $2, $3)', [id, userId, 'upvote']);
      await db.query('UPDATE posts SET upvotes = upvotes + 1 WHERE id = $1', [id]);
    }
    await db.query('COMMIT');
    // Fetch the full updated post
    const { rows } = await db.query(
      `SELECT p.*, u.username,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'upvote') as upvotes,
        (SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'downvote') as downvotes,
        (SELECT vote_type FROM post_votes WHERE post_id = p.id AND user_id = $2) as userVoteType
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id, userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(rows[0]);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error upvoting post:', error);
    res.status(500).json({ error: 'Failed to upvote post' });
  }
});

// Downvote a post
router.post('/:id/downvote', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const db = req.app.locals.db;
  try {
    // Check if user is blocked
    if (await checkBlockedUser(db, userId)) {
      return res.status(403).json({ error: 'Your account has been blocked' });
    }
    // Check if post is blocked
    const { rows: postRows } = await db.query('SELECT blocked FROM posts WHERE id = $1', [id]);
    if (postRows.length === 0) return res.status(404).json({ error: 'Post not found' });
    if (postRows[0].blocked) return res.status(403).json({ error: 'This post is blocked' });
    // Check if user has already voted
    const { rows: existing } = await db.query(
      'SELECT * FROM post_votes WHERE post_id = $1 AND user_id = $2',
      [id, userId]
    );
    await db.query('BEGIN');
    if (existing.length > 0) {
      if (existing[0].vote_type === 'downvote') {
        // Remove downvote
        await db.query('DELETE FROM post_votes WHERE post_id = $1 AND user_id = $2', [id, userId]);
        await db.query('UPDATE posts SET downvotes = downvotes - 1 WHERE id = $1', [id]);
      } else {
        // Change upvote to downvote
        await db.query('UPDATE post_votes SET vote_type = $1 WHERE post_id = $2 AND user_id = $3', ['downvote', id, userId]);
        await db.query('UPDATE posts SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = $1', [id]);
      }
    } else {
      // New downvote
      await db.query('INSERT INTO post_votes (post_id, user_id, vote_type) VALUES ($1, $2, $3)', [id, userId, 'downvote']);
      await db.query('UPDATE posts SET downvotes = downvotes + 1 WHERE id = $1', [id]);
    }
    await db.query('COMMIT');
    // Fetch the full updated post
    const { rows } = await db.query(
      `SELECT p.*, u.username,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'upvote') as upvotes,
        (SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'downvote') as downvotes,
        (SELECT vote_type FROM post_votes WHERE post_id = p.id AND user_id = $2) as userVoteType
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id, userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(rows[0]);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error downvoting post:', error);
    res.status(500).json({ error: 'Failed to downvote post' });
  }
});

// Admin: Block/unblock post
router.patch('/:id/block', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    // Toggle blocked status
    await db.query('UPDATE posts SET blocked = NOT COALESCE(blocked, false) WHERE id = $1', [id]);
    // Return updated post with author and status
    const { rows } = await db.query(
      `SELECT p.id, p.title, u.username as author, p.created_at as "createdAt", (CASE WHEN p.blocked THEN 'blocked' ELSE 'active' END) as status
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error blocking/unblocking post:', error);
    res.status(500).json({ error: 'Failed to block/unblock post' });
  }
});

// Get share information for a post
router.get('/:identifier/share', async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = req.app.locals.db;
    
    // Check if identifier is a number (ID) or string (slug)
    const isNumeric = !isNaN(identifier) && !isNaN(parseFloat(identifier));
    
    let query;
    let params;
    
    if (isNumeric) {
      query = `
        SELECT p.id, p.title, p.slug, p.content, u.username, p.created_at
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = $1 AND p.blocked = false
      `;
      params = [identifier];
    } else {
      query = `
        SELECT p.id, p.title, p.slug, p.content, u.username, p.created_at
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.slug = $1 AND p.blocked = false
      `;
      params = [identifier];
    }

    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = result.rows[0];
    const baseUrl = process.env.FRONTEND_URL || 'https://yourdomain.com';
    const shareUrl = `${baseUrl}/post/${post.slug}`;
    
    res.json({
      id: post.id,
      title: post.title,
      slug: post.slug,
      author: post.username,
      createdAt: post.created_at,
      shareUrl: shareUrl,
      shareText: `Check out this post on LeftPlot: "${post.title}" by ${post.username}`,
      socialShare: {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this post on LeftPlot: "${post.title}"`)}&url=${encodeURIComponent(shareUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`Check out this post on LeftPlot: "${post.title}" ${shareUrl}`)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out this post on LeftPlot: "${post.title}"`)}`
      }
    });
  } catch (error) {
    console.error('Error fetching share information:', error);
    res.status(500).json({ error: 'Error fetching share information' });
  }
});

module.exports = router;