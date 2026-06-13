const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();
const { pool } = require('./db/pool');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 1000*60*60*8 }
}));
app.use((req,res,next)=>{ res.locals.user=req.session.user; res.locals.flash=req.session.flash; delete req.session.flash; next(); });

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/dashboard'));
app.use('/patients', require('./routes/patients'));
app.use('/appointments', require('./routes/appointments'));
app.use('/lab', require('./routes/lab'));
app.use('/billing', require('./routes/billing'));
app.use('/admin', require('./routes/admin'));

app.use((err, req, res, next) => {
  console.error(err);
  const msg = err.constraint === 'no_doctor_double_booking'
    ? 'This doctor already has an appointment in the selected time slot. Please choose another slot.'
    : (err.message || 'Something went wrong.');
  res.status(500).render('error', { title: 'Application Error', message: msg });
});
app.get('/debug-login-check', async (req, res) => {
  const result = await pool.query('SELECT email, password, role FROM users');
  res.json(result.rows);
});

const port = process.env.PORT || 3000;
const ensureAdmin = async () => {
  const res = await pool.query(
    "SELECT * FROM users WHERE email = 'admin@hms.local'"
  );

  if (res.rows.length === 0) {
    console.log("Seeding default users...");

    await pool.query(`
      INSERT INTO users (name, email, password, role)
      VALUES
      ('Admin', 'admin@hms.local', 'Admin@123', 'admin'),
      ('Doctor', 'doctor@hms.local', 'Doctor@123', 'doctor'),
      ('Staff', 'staff@hms.local', 'Staff@123', 'staff');
    `);

    console.log("Default users created");
  }
};

ensureAdmin();
app.listen(port, () => console.log(`HMS ADBMS app running on port ${port}`));
