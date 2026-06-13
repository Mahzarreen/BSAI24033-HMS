router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await pool.query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email=$1 AND is_active=true',
    [email]
  );

  const user = rows[0];

  // DEBUG (temporary - helps confirm issue)
  console.log("LOGIN ATTEMPT:", email, password);
  console.log("DB USER:", user);

  if (!user) {
    return res.status(401).render('login', {
      title: 'Login',
      error: 'Invalid email or password.'
    });
  }

  /**
   * FINAL FIX LOGIC:
   * Works for BOTH plain text and hashed DB cases
   */
  let isValid = false;

  try {
    // try bcrypt first (safe check)
    isValid = await bcrypt.compare(password, user.password_hash);
  } catch (e) {
    // fallback to plain text
    isValid = user.password_hash === password;
  }

  if (!isValid) {
    return res.status(401).render('login', {
      title: 'Login',
      error: 'Invalid email or password.'
    });
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  return res.redirect('/dashboard');
}));