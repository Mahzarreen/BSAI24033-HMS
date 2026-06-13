const express=require('express');
const bcrypt=require('bcryptjs');
const { pool }=require('../db/pool');
const { requireRole, asyncHandler }=require('../middleware');
const router=express.Router();
router.get('/', requireRole('admin'), asyncHandler(async(req,res)=>{
 const users=(await pool.query('SELECT id,name,email,role,phone,is_active,created_at FROM users ORDER BY created_at DESC')).rows;
 const depts=(await pool.query('SELECT * FROM departments ORDER BY name')).rows;
 const tests=(await pool.query('SELECT * FROM lab_tests ORDER BY test_name')).rows;
 const audit=(await pool.query('SELECT * FROM audit_logs ORDER BY changed_at DESC LIMIT 50')).rows;
 res.render('admin/index',{title:'Administration',users,depts,tests,audit});
}));
router.post('/users', requireRole('admin'), asyncHandler(async(req,res)=>{
 const hash=await bcrypt.hash(req.body.password,10);
 const u=(await pool.query(`INSERT INTO users(name,email,password_hash,role,phone) VALUES($1,$2,$3,$4,$5) RETURNING id`,[req.body.name,req.body.email,hash,req.body.role,req.body.phone])).rows[0];
 if(req.body.role==='doctor'){
  await pool.query(`INSERT INTO doctors(user_id,department_id,specialization,consultation_fee,available_from,available_to,room_no) VALUES($1,$2,$3,$4,$5,$6,$7)`,[u.id,req.body.department_id||null,req.body.specialization||'General',req.body.consultation_fee||1000,req.body.available_from||'09:00',req.body.available_to||'17:00',req.body.room_no||null]);
 }
 res.redirect('/admin');
}));
router.post('/departments', requireRole('admin'), asyncHandler(async(req,res)=>{ await pool.query('INSERT INTO departments(name,description) VALUES($1,$2) ON CONFLICT(name) DO UPDATE SET description=EXCLUDED.description',[req.body.name,req.body.description]); res.redirect('/admin'); }));
router.post('/tests', requireRole('admin'), asyncHandler(async(req,res)=>{ await pool.query('INSERT INTO lab_tests(test_name,description,price,normal_range) VALUES($1,$2,$3,$4) ON CONFLICT(test_name) DO UPDATE SET description=EXCLUDED.description, price=EXCLUDED.price, normal_range=EXCLUDED.normal_range',[req.body.test_name,req.body.description,req.body.price,req.body.normal_range]); res.redirect('/admin'); }));
module.exports=router;
