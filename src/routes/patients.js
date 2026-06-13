const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth, requireRole, asyncHandler } = require('../middleware');
const router=express.Router();
router.get('/', requireAuth, asyncHandler(async(req,res)=>{
  const q=(req.query.q||'').trim();
  const rows=(await pool.query(q ? `SELECT * FROM patients WHERE to_tsvector('english', full_name||' '||COALESCE(phone,'')||' '||mrn) @@ plainto_tsquery('english',$1) OR full_name ILIKE $2 OR phone ILIKE $2 OR mrn ILIKE $2 ORDER BY created_at DESC` : 'SELECT * FROM patients ORDER BY created_at DESC LIMIT 100', q ? [q,`%${q}%`] : [])).rows;
  res.render('patients/index',{title:'Patients',patients:rows,q});
}));
router.get('/new', requireRole('admin','staff'), (req,res)=>res.render('patients/form',{title:'Register Patient',patient:{}}));
router.post('/', requireRole('admin','staff'), asyncHandler(async(req,res)=>{
  const {full_name,gender,date_of_birth,phone,email,address,blood_group,emergency_contact,medical_history,allergies}=req.body;
  const mrn='MRN-'+Date.now().toString().slice(-8);
  await pool.query(`INSERT INTO patients(mrn,full_name,gender,date_of_birth,phone,email,address,blood_group,emergency_contact,medical_history,allergies,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[mrn,full_name,gender,date_of_birth||null,phone,email,address,blood_group,emergency_contact,medical_history,allergies,req.session.user.id]);
  res.redirect('/patients');
}));
router.get('/:id', requireAuth, asyncHandler(async(req,res)=>{
  const patient=(await pool.query('SELECT * FROM patients WHERE id=$1',[req.params.id])).rows[0];
  const appointments=(await pool.query('SELECT v.* FROM vw_doctor_schedule v JOIN appointments a ON a.id=v.id WHERE a.patient_id=$1 ORDER BY scheduled_at DESC',[req.params.id])).rows;
  const labs=(await pool.query(`SELECT lr.*, lt.test_name, u.name AS doctor_name FROM lab_requests lr JOIN lab_tests lt ON lt.id=lr.lab_test_id JOIN doctors d ON d.id=lr.doctor_id JOIN users u ON u.id=d.user_id WHERE lr.patient_id=$1 ORDER BY requested_at DESC`,[req.params.id])).rows;
  const bills=(await pool.query('SELECT * FROM vw_billing_summary WHERE id IN (SELECT id FROM bills WHERE patient_id=$1) ORDER BY created_at DESC',[req.params.id])).rows;
  res.render('patients/show',{title:patient.full_name,patient,appointments,labs,bills});
}));
router.get('/:id/edit', requireRole('admin','staff'), asyncHandler(async(req,res)=>{
  const patient=(await pool.query('SELECT * FROM patients WHERE id=$1',[req.params.id])).rows[0];
  res.render('patients/form',{title:'Edit Patient',patient});
}));
router.post('/:id', requireRole('admin','staff'), asyncHandler(async(req,res)=>{
  const {full_name,gender,date_of_birth,phone,email,address,blood_group,emergency_contact,medical_history,allergies}=req.body;
  await pool.query(`UPDATE patients SET full_name=$1,gender=$2,date_of_birth=$3,phone=$4,email=$5,address=$6,blood_group=$7,emergency_contact=$8,medical_history=$9,allergies=$10 WHERE id=$11`,[full_name,gender,date_of_birth||null,phone,email,address,blood_group,emergency_contact,medical_history,allergies,req.params.id]);
  res.redirect('/patients/'+req.params.id);
}));
module.exports=router;
