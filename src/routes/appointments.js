const express=require('express');
const { pool }=require('../db/pool');
const { requireAuth, requireRole, asyncHandler }=require('../middleware');
const router=express.Router();
router.get('/', requireAuth, asyncHandler(async(req,res)=>{
 const {status='',doctor='',date=''}=req.query; let where=[]; let p=[];
 if(status){p.push(status); where.push(`a.status=$${p.length}`)} if(doctor){p.push(doctor); where.push(`d.id=$${p.length}`)} if(date){p.push(date); where.push(`a.scheduled_at::date=$${p.length}`)}
 const sql=`SELECT a.*, p.full_name patient_name, p.mrn, u.name doctor_name FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN doctors d ON d.id=a.doctor_id JOIN users u ON u.id=d.user_id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY scheduled_at DESC LIMIT 150`;
 const rows=(await pool.query(sql,p)).rows;
 const doctors=(await pool.query(`SELECT d.id,u.name FROM doctors d JOIN users u ON u.id=d.user_id ORDER BY u.name`)).rows;
 res.render('appointments/index',{title:'Appointments',appointments:rows,doctors,filters:req.query});
}));
router.get('/new', requireRole('admin','staff'), asyncHandler(async(req,res)=>{
 const patients=(await pool.query('SELECT id,mrn,full_name FROM patients ORDER BY full_name')).rows;
 const doctors=(await pool.query(`SELECT d.*, u.name, dep.name department FROM doctors d JOIN users u ON u.id=d.user_id LEFT JOIN departments dep ON dep.id=d.department_id ORDER BY u.name`)).rows;
 res.render('appointments/form',{title:'New Appointment',patients,doctors});
}));
router.post('/', requireRole('admin','staff'), asyncHandler(async(req,res)=>{
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const {patient_id,doctor_id,scheduled_at,duration_minutes,reason}=req.body;
  const appt=(await client.query(`INSERT INTO appointments(patient_id,doctor_id,scheduled_at,duration_minutes,reason,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[patient_id,doctor_id,scheduled_at,duration_minutes||30,reason,req.session.user.id])).rows[0];
  const doc=(await client.query('SELECT consultation_fee FROM doctors WHERE id=$1',[doctor_id])).rows[0];
  const billNo='BILL-'+Date.now().toString().slice(-9);
  const bill=(await client.query(`INSERT INTO bills(bill_no,patient_id,appointment_id,created_by) VALUES($1,$2,$3,$4) RETURNING id`,[billNo,patient_id,appt.id,req.session.user.id])).rows[0];
  await client.query(`INSERT INTO bill_items(bill_id,item_type,description,quantity,unit_price) VALUES($1,'consultation','Doctor Consultation',1,$2)`,[bill.id,doc.consultation_fee]);
  await client.query('COMMIT');
  res.redirect('/appointments');
 } catch(e){ await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}));
router.post('/:id/status', requireAuth, asyncHandler(async(req,res)=>{
 await pool.query('UPDATE appointments SET status=$1, notes=$2 WHERE id=$3',[req.body.status, req.body.notes||null, req.params.id]);
 res.redirect('/appointments');
}));
module.exports=router;
