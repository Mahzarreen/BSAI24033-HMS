function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (!roles.includes(req.session.user.role)) return res.status(403).render('error', { title:'Access denied', message:'You do not have permission to access this page.' });
    next();
  };
}
function asyncHandler(fn) { return (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next); }
module.exports = { requireAuth, requireRole, asyncHandler };
