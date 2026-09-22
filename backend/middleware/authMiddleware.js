const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nexusflow_jwt_secret_key_2026_production_grade';

/**
 * Authentication Middleware
 * Validates JSON Web Token in the Authorization header.
 * Attaches decoded user payload (id, email, name) to req.user.
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: 'Access denied. No authorization header provided.',
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Invalid authorization format. Expected "Bearer <token>".',
      });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Session expired. Please log in again.',
      });
    }
    return res.status(401).json({
      error: 'Invalid authentication token.',
    });
  }
};

module.exports = authMiddleware;
