const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { AppError } = require('./errorHandler');
const { UserStore, sanitizeUser } = require('../db/userStore');

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new AppError('Authentication required. Empty token.', 401, 'UNAUTHORIZED');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN');
    }

    const user = await UserStore.findById(decoded.id);
    if (!user) {
      throw new AppError('User account associated with this token no longer exists.', 401, 'USER_NOT_FOUND');
    }

    // Attach user profile ensuring user isolation across endpoints
    req.user = sanitizeUser(user);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authenticateToken,
};
