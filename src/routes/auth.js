const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/pool');
const { asyncHandler } = require('../middleware');
const router = express.Router();

router.get('/', (req,res)=> res.redirect(req.session.user ? '/dashboard' : '/login'));
router.get('/login', (req,res)=> res.render('login', { title:'Login' }));
router.post('/login', asyncHandler(async (req,res)=>{
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT id,name,email,password_hash,role FROM users WHERE email=$1 AND is_active=true', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).render('login', { title:'Login', error:'Invalid email or password.' });
  }
  req.session.user = { id:user.id, name:user.name, email:user.email, role:user.role };
  res.redirect('/dashboard');
}));
router.post('/logout', (req,res)=> req.session.destroy(()=>res.redirect('/login')));
module.exports = router;
