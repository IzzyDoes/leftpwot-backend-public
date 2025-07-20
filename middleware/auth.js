const jwt = require('jsonwebtoken');
const { getSecrets } = require('../secrets');

const secrets = getSecrets();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, secrets.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT Verification error:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user is verified (for non-admin users)
const requireVerification = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    
    // Get user from database to check verification status
    const { rows } = await db.query(
      'SELECT verified, role FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = rows[0];
    
    // Allow admins to bypass verification check
    if (user.role === 'admin') {
      return next();
    }
    
    // Require verification for regular users
    if (!user.verified) {
      return res.status(403).json({ 
        error: 'Please verify your email before accessing this resource',
        needsVerification: true 
      });
    }
    
    next();
  } catch (error) {
    console.error('Verification check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check admin role
const isAdmin = (req, res, next) => {
  // First authenticate the token
  authenticateToken(req, res, (err) => {
    if (err) return next(err);
    
    // Check if user has admin role
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ error: 'Access denied. Admin role required' });
    }
  });
};

module.exports = {
  authenticateToken,
  requireVerification,
  isAdmin
};
