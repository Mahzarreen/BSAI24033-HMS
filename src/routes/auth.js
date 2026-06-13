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
  console.log("PASSWORD INPUT:", password);
  console.log("DB PASSWORD:", user?.password_hash, user?.password);
  if (!user) {
    return res.status(401).render('login', {
      title: 'Login',
      error: 'Invalid email or password.'
    });
  }

  // FIX: support multiple DB schemas
  const dbPassword = user.password_hash || user.password;

  let isValid = false;

  // Try bcrypt first (if hashed password exists)
  try {
    isValid = await bcrypt.compare(password, dbPassword);
  } catch (err) {
    // fallback for plain text DB passwords
    isValid = dbPassword === password;
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