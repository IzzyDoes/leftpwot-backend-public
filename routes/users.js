const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const bcrypt = require('bcrypt');

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    
    const { rows } = await db.query(
      'SELECT id, username, created_at, role FROM users WHERE id = $1',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    const db = req.app.locals.db;
    
    // Check if username already exists for another user
    const { rows: existingUsers } = await db.query(
      'SELECT * FROM users WHERE username = $1 AND id != $2',
      [username, userId]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    const { rows } = await db.query(
      `UPDATE users
       SET username = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, username, email, role`,
      [username, userId]
    );
    
    res.json({
      message: 'Profile updated successfully',
      user: rows[0]
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    const db = req.app.locals.db;
    
    // Get current user data to check password
    const { rows: userRows } = await db.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, userRows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await db.query(
      `UPDATE users
       SET password = $1, updated_at = NOW()
       WHERE id = $2`,
      [hashedPassword, userId]
    );
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Admin: Get all users
router.get('/', isAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { rows } = await db.query("SELECT id, username, email, role, verified, (CASE WHEN blocked THEN 'blocked' ELSE 'active' END) as status FROM users");
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Block/unblock user
router.patch('/:id/block', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    // Toggle blocked status
    const { rows } = await db.query("UPDATE users SET blocked = NOT COALESCE(blocked, false) WHERE id = $1 RETURNING id, username, email, role, (CASE WHEN blocked THEN 'blocked' ELSE 'active' END) as status", [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    // Return username as name for frontend compatibility
    const user = rows[0];
    res.json({ id: user.id, name: user.username, email: user.email, role: user.role, status: user.status });
  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    res.status(500).json({ error: 'Failed to block/unblock user' });
  }
});

// Admin: Delete user
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const { rows } = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
