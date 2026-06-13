const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth, asyncHandler } = require('../middleware');
const router = express.Router();
router.get('/dashboard', requireAuth, asyncHandler(async (req,res)=>{
  const user=req.session.user;
  let data={};
  if (user.role==='admin') {
    data.summary=(await pool.query('SELECT * FROM vw_admin_dashboard')).rows[0];
    data.recent=(await pool.query('SELECT * FROM vw_doctor_schedule ORDER BY scheduled_at DESC LIMIT 8')).rows;
  } else if (user.role==='doctor') {
    const doc=(await pool.query('SELECT d.id FROM doctors d WHERE d.user_id=$1',[user.id])).rows[0];
    data.schedule= doc ? (await pool.query('SELECT * FROM vw_doctor_schedule WHERE doctor_id=$1 ORDER BY scheduled_at LIMIT 20',[doc.id])).rows : [];
    data.pendingLabs= doc ? (await pool.query(`SELECT lr.*, p.full_name, lt.test_name FROM lab_requests lr JOIN patients p ON p.id=lr.patient_id JOIN lab_tests lt ON lt.id=lr.lab_test_id WHERE lr.doctor_id=$1 ORDER BY requested_at DESC LIMIT 10`,[doc.id])).rows : [];
  } else {
    data.today=(await pool.query(`SELECT * FROM vw_doctor_schedule WHERE scheduled_at::date=CURRENT_DATE ORDER BY scheduled_at`)).rows;
    data.bills=(await pool.query(`SELECT * FROM vw_billing_summary ORDER BY created_at DESC LIMIT 8`)).rows;
  }
  res.render('dashboard',{ title:'Dashboard', data });
}));
module.exports=router;
