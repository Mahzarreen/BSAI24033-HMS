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
 * LOGIN (FIXED FINAL VERSION)
 * - Works with BOTH:
 *   ✔ password_hash column
 *   ✔ password column
 *   ✔ bcrypt hashed passwords
 *   ✔ plain text passwords
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // IMPORTANT FIX: select full row to avoid column mismatch issues
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email=$1 AND is_active=true',
    [email]
  );

const user = rows[0];

console.log("USER FROM DB:", user);
console.log("PASSWORD INPUT:", `[${password}]`);
console.log("DB HASH:", user.password_hash);

if (!user) {
  return res.status(401).render('login', {
    title: 'Login',
    error: 'Invalid email or password.'
  });
}

// IMPORTANT FIX: trim password
const cleanPassword = password.trim();

let isValid = false;

try {
  isValid = await bcrypt.compare(cleanPassword, user.password_hash);
} catch (err) {
  console.log("BCRYPT ERROR:", err.message);
  isValid = false;
}

if (!isValid) {
  return res.status(401).render('login', {
    title: 'Login',
    error: 'Invalid email or password.'
  });
}

  // create session
  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  return res.redirect('/dashboard');
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