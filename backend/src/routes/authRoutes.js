const express = require('express');
const { z } = require('zod');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { AppError } = require('../middleware/errorHandler');
const { UserStore, sanitizeUser } = require('../db/userStore');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation Schemas
const RegisterSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().trim().min(1, 'Full name is required'),
  role: z.enum(['admin', 'operator', 'analyst', 'user']).optional().default('operator'),
});

const LoginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', async (req, res, next) => {
  try {
    const validatedData = RegisterSchema.parse(req.body);

    const existingUser = await UserStore.findByEmail(validatedData.email);
    if (existingUser) {
      throw new AppError('An account with this email address already exists.', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(validatedData.password, salt);

    const newUser = await UserStore.createUser({
      email: validatedData.email,
      password_hash,
      full_name: validatedData.full_name,
      role: validatedData.role,
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'Registration successful',
      user: sanitizeUser(newUser),
      token,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Authenticate existing user
 */
router.post('/login', async (req, res, next) => {
  try {
    const validatedData = LoginSchema.parse(req.body);

    const user = await UserStore.findByEmail(validatedData.email);
    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(validatedData.password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticateToken, async (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

module.exports = router;
