const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { getSecrets } = require('../secrets');

const secrets = getSecrets();

let transporter;
if (secrets.NODE_ENV === 'test') {
  // Use a stub transport for tests to avoid network timeouts
  transporter = nodemailer.createTransport({ jsonTransport: true });
} else {
  transporter = nodemailer.createTransport({
    host: secrets.SMTP_HOST,
    port: secrets.SMTP_PORT,
    secure: secrets.SMTP_SECURE === 'true',
    auth: {
      user: secrets.SMTP_USER,
      pass: secrets.SMTP_PASS
    }
  });
}

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }
    
    // Check username and password requirements
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const db = req.app.locals.db;
    
    // Check if username or email already exists
    const { rows: existingUsers } = await db.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      if (existingUsers[0].username === username) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const { rows } = await db.query(
      `INSERT INTO users (username, email, password, created_at, role, verified)
       VALUES ($1, $2, $3, NOW(), 'user', false)
       RETURNING id, username, email, role`,
      [username, email, hashedPassword]
    );
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    // Save verification token
    await db.query(
      `INSERT INTO verification_tokens (user_id, token, created_at, expires_at)
       VALUES ($1, $2, NOW(), $3)`,
      [rows[0].id, verificationToken, expiresAt]
    );

    // Send verification email (skip in test environment)
    if (secrets.NODE_ENV !== 'test') {
      const verificationUrl = `${secrets.FRONTEND_URL}/api/auth/verify-email?token=${verificationToken}`;
      await transporter.sendMail({
        from: secrets.SMTP_FROM,
        to: email,
        subject: 'Verify your email address',
        html: `
          <h1>Welcome to Amebo!</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationUrl}">${verificationUrl}</a>
          <p>This link will expire in 24 hours.</p>
        `
      });
    }
    
    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: rows[0].id,
        username: rows[0].username,
        email: rows[0].email,
        role: rows[0].role
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    const db = req.app.locals.db;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find the token
    const { rows: tokenRows } = await db.query(
      `SELECT vt.*, u.email 
       FROM verification_tokens vt
       JOIN users u ON vt.user_id = u.id
       WHERE vt.token = $1 AND vt.expires_at > NOW()`,
      [token]
    );

    if (tokenRows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Update user as verified
    await db.query(
      'UPDATE users SET verified = true WHERE id = $1',
      [tokenRows[0].user_id]
    );

    // Delete the used token
    await db.query(
      'DELETE FROM verification_tokens WHERE token = $1',
      [token]
    );

    return res.redirect(302, `${secrets.FRONTEND_URL}/sign-in?verified=1`);
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const db = req.app.locals.db;
    
    // Find user by email
    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = rows[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Prevent blocked users from logging in
    if (user.blocked) {
      return res.status(403).json({ error: 'Your account has been blocked' });
    }

    // Only check email verification for non-admin users
    if (user.role !== 'admin' && !user.verified) {
      return res.status(401).json({ error: 'Please verify your email before logging in' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      secrets.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const db = req.app.locals.db;

    // Find user
    const { rows: userRows } = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRows[0];

    if (user.verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Delete any existing tokens for this user
    await db.query(
      'DELETE FROM verification_tokens WHERE user_id = $1',
      [user.id]
    );

    // Save new verification token
    await db.query(
      `INSERT INTO verification_tokens (user_id, token, created_at, expires_at)
       VALUES ($1, $2, NOW(), $3)`,
      [user.id, verificationToken, expiresAt]
    );

    // Send verification email (skip in test environment)
    if (secrets.NODE_ENV !== 'test') {
      const verificationUrl = `${secrets.FRONTEND_URL}/api/auth/verify-email?token=${verificationToken}`;
      await transporter.sendMail({
        from: secrets.SMTP_FROM,
        to: email,
        subject: 'Verify your email address',
        html: `
          <h1>Welcome to Amebo!</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationUrl}">${verificationUrl}</a>
          <p>This link will expire in 24 hours.</p>
        `
      });
    }

    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Error resending verification email:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, secrets.JWT_SECRET);
      const db = req.app.locals.db;
      
      // Get user from database
      const { rows } = await db.query(
        'SELECT id, username, email, role, verified FROM users WHERE id = $1',
        [decoded.id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = rows[0];
      
      // Prevent unverified users from accessing profile (except admins)
      if (user.role !== 'admin' && !user.verified) {
        return res.status(403).json({ 
          error: 'Please verify your email before accessing your profile',
          needsVerification: true 
        });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        verified: user.verified
      });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// --- Password Reset (Session-based) ---

// Request password reset (send code)
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const db = req.app.locals.db;
    // Find user
    const { rows: userRows } = await db.query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (userRows.length === 0) {
      // For security, always respond with success
      return res.json({ message: 'If that email exists, a reset code has been sent.' });
    }
    const user = userRows[0];
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    // Delete any existing codes for this user
    await db.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
    // Save code
    await db.query(
      'INSERT INTO password_resets (user_id, code, created_at, expires_at) VALUES ($1, $2, NOW(), $3)',
      [user.id, code, expiresAt]
    );
    // Delete any existing sessions for this user
    await db.query('DELETE FROM password_reset_sessions WHERE user_id = $1', [user.id]);
    // Send email (skip in test environment)
    if (secrets.NODE_ENV !== 'test') {
      await transporter.sendMail({
        from: secrets.SMTP_FROM,
        to: user.email,
        subject: 'Your LeftPlot Password Reset Code',
        html: `<p>Your password reset code is:</p><h2>${code}</h2><p>This code expires in 15 minutes.</p>`
      });
    }
    res.json({ message: 'If that email exists, a reset code has been sent.' });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Failed to request password reset' });
  }
});

// Verify reset code (returns a session token)
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });
    const db = req.app.locals.db;
    // Find code
    const { rows: codeRows } = await db.query(
      'SELECT * FROM password_resets WHERE code = $1 AND expires_at > NOW()',
      [code]
    );
    if (codeRows.length === 0) return res.status(400).json({ error: 'Invalid or expired code' });
    const userId = codeRows[0].user_id;
    // Create a session token
    const sessionToken = uuidv4();
    // Store session
    await db.query(
      'INSERT INTO password_reset_sessions (user_id, session_token, created_at) VALUES ($1, $2, NOW())',
      [userId, sessionToken]
    );
    res.json({ message: 'Code verified', sessionToken });
  } catch (error) {
    console.error('Error verifying reset code:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Reset password (requires session token and newPassword)
router.post('/reset-password', async (req, res) => {
  try {
    const { sessionToken, newPassword } = req.body;
    if (!sessionToken || !newPassword) return res.status(400).json({ error: 'Session token and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const db = req.app.locals.db;
    // Find session
    const { rows: sessionRows } = await db.query('SELECT * FROM password_reset_sessions WHERE session_token = $1', [sessionToken]);
    if (sessionRows.length === 0) return res.status(400).json({ error: 'Invalid or expired session' });
    const userId = sessionRows[0].user_id;
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    // Update password
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    // Delete used code and session
    await db.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM password_reset_sessions WHERE user_id = $1', [userId]);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
