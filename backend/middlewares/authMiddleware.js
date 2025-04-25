
const jwt = require('jsonwebtoken');
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, "s3cR3tK3y@2024!example#");
    req.user = decoded;

    // Add branch validation
    if (!decoded.role && !decoded.branch) {
      return res.status(401).json({ error: 'Branch is missing in token' });
    }

    // Allow admin users without branch
    if (decoded.role === 'admin') {
      next();
      return;
    }

    // Require branch for non-admin users
    if (!decoded.branch) {
      return res.status(401).json({ error: 'Branch is missing in token' });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;