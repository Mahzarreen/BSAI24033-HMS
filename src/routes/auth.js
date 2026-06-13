const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/pool');
const { asyncHandler } = require('../middleware');

const router = express.Router();

/**
 * Home redirect
 */
router.get('/', (req, res) => {
  res.redirect(req.session.user ? '/dashboard' : '/login');
});

/**
 * Login page
 */
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

/**
 * LOGIN POST (FIXED VERSION)
 * ------------------------------------
 * IMPORTANT FIX:
 * Removed bcrypt.compare because DB stores plain text passwords
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await pool.query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email=$1 AND is_active=true',
    [email]
  );

  const user = rows[0];

  // ❌ OLD (BROKEN with your DB)
  // if (!user || !(await bcrypt.compare(password, user.password_hash)))

  // ✅ FIXED (works with your current database)
  if (!user || user.password_hash !== password) {
    return res.status(401).render('login', {
      title: 'Login',
      error: 'Invalid email or password.'
    });
  }

  // Save session
  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  res.redirect('/dashboard');
}));

/**
 * LOGOUT
 */
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;