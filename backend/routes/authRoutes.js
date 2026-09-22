const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { getIsConnected } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'nexusflow_jwt_secret_key_2026_production_grade';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// In-memory user store for fallback if MongoDB is not connected
const inMemoryUsers = [
  {
    _id: 'usr-admin-01',
    name: 'IoT Admin',
    email: 'admin@nexusflow.io',
    // bcrypt hash of 'admin123'
    password: bcrypt.hashSync('admin123', 10),
    createdAt: new Date().toISOString(),
  },
];

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (getIsConnected()) {
      // Check MongoDB
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }

      const newUser = new User({
        name: name.trim(),
        email: cleanEmail,
        password,
      });
      await newUser.save();

      const token = generateToken({
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
      });

      return res.status(201).json({
        message: 'Account created successfully.',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
        },
      });
    }

    // In-memory fallback
    const existing = inMemoryUsers.find((u) => u.email === cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const fallbackUser = {
      _id: `usr-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };
    inMemoryUsers.push(fallbackUser);

    const token = generateToken({
      id: fallbackUser._id,
      email: fallbackUser.email,
      name: fallbackUser.name,
    });

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: fallbackUser._id,
        name: fallbackUser.name,
        email: fallbackUser.email,
      },
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ error: 'Registration failed due to an unexpected server error.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Both email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (getIsConnected()) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = generateToken({
        id: user._id,
        email: user.email,
        name: user.name,
      });

      return res.json({
        message: 'Login successful.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    }

    // In-memory fallback
    const user = inMemoryUsers.find((u) => u.email === cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken({
      id: user._id,
      email: user.email,
      name: user.name,
    });

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ error: 'Login failed due to an unexpected server error.' });
  }
});

/**
 * GET /api/auth/me
 * Return currently authenticated user profile
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (getIsConnected()) {
      const user = await User.findById(req.user.id).select('-password');
      if (user) {
        return res.json({
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
        });
      }
    }

    // Fallback or in-memory
    return res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (err) {
    console.error('[Auth /me Error]:', err);
    return res.status(500).json({ error: 'Could not fetch user profile.' });
  }
});

module.exports = router;
