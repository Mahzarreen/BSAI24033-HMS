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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`HMS ADBMS app running on port ${port}`));
