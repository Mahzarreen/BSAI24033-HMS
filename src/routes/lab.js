const express=require('express');
const { pool }=require('../db/pool');
const { requireAuth, asyncHandler }=require('../middleware');
const router=express.Router();
router.get('/', requireAuth, asyncHandler(async(req,res)=>{
 const status=req.query.status||''; const params=status?[status]:[];
 const rows=(await pool.query(`SELECT lr.*, p.full_name patient_name, lt.test_name, lt.price, u.name doctor_name FROM lab_requests lr JOIN patients p ON p.id=lr.patient_id JOIN lab_tests lt ON lt.id=lr.lab_test_id JOIN doctors d ON d.id=lr.doctor_id JOIN users u ON u.id=d.user_id ${status?'WHERE lr.status=$1':''} ORDER BY requested_at DESC`,params)).rows;
 res.render('lab/index',{title:'Lab Management',requests:rows,status});
}));
router.get('/request', requireAuth, asyncHandler(async(req,res)=>{
 const patients=(await pool.query('SELECT id,mrn,full_name FROM patients ORDER BY full_name')).rows;
 const doctors=(await pool.query('SELECT d.id,u.name FROM doctors d JOIN users u ON u.id=d.user_id ORDER BY u.name')).rows;
 const tests=(await pool.query('SELECT * FROM lab_tests ORDER BY test_name')).rows;
 const appointments=(await pool.query(`SELECT a.id,p.full_name,u.name doctor_name,a.scheduled_at FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN doctors d ON d.id=a.doctor_id JOIN users u ON u.id=d.user_id WHERE a.status='scheduled' ORDER BY a.scheduled_at DESC LIMIT 100`)).rows;
 res.render('lab/form',{title:'Request Lab Test',patients,doctors,tests,appointments});
}));
router.post('/request', requireAuth, asyncHandler(async(req,res)=>{
 await pool.query(`INSERT INTO lab_requests(appointment_id,patient_id,doctor_id,lab_test_id,status) VALUES($1,$2,$3,$4,'requested')`,[req.body.appointment_id||null,req.body.patient_id,req.body.doctor_id,req.body.lab_test_id]);
 res.redirect('/lab');
}));
router.post('/:id/update', requireAuth, asyncHandler(async(req,res)=>{
 const completed=req.body.status==='completed';
 await pool.query(`UPDATE lab_requests SET status=$1,result_value=$2,result_notes=$3,completed_at=CASE WHEN $4 THEN NOW() ELSE completed_at END WHERE id=$5`,[req.body.status,req.body.result_value,req.body.result_notes,completed,req.params.id]);
 res.redirect('/lab');
}));
module.exports=router;
