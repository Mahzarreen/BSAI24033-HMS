const express=require('express');
const { pool }=require('../db/pool');
const { requireAuth, requireRole, asyncHandler }=require('../middleware');
const router=express.Router();
router.get('/', requireAuth, asyncHandler(async(req,res)=>{
 const q=req.query.q||''; const rows=(await pool.query(q?`SELECT * FROM vw_billing_summary WHERE bill_no ILIKE $1 OR patient_name ILIKE $1 ORDER BY created_at DESC`:`SELECT * FROM vw_billing_summary ORDER BY created_at DESC LIMIT 150`, q?[`%${q}%`]:[])).rows;
 res.render('billing/index',{title:'Billing',bills:rows,q});
}));
router.get('/:id', requireAuth, asyncHandler(async(req,res)=>{
 const bill=(await pool.query('SELECT * FROM vw_billing_summary WHERE id=$1',[req.params.id])).rows[0];
 const items=(await pool.query('SELECT * FROM bill_items WHERE bill_id=$1 ORDER BY id',[req.params.id])).rows;
 const payments=(await pool.query('SELECT p.*, u.name received_by_name FROM payments p LEFT JOIN users u ON u.id=p.received_by WHERE bill_id=$1 ORDER BY paid_at DESC',[req.params.id])).rows;
 res.render('billing/show',{title:'Bill '+bill.bill_no,bill,items,payments});
}));
router.post('/:id/items', requireRole('admin','staff'), asyncHandler(async(req,res)=>{
 await pool.query(`INSERT INTO bill_items(bill_id,item_type,description,quantity,unit_price) VALUES($1,$2,$3,$4,$5)`,[req.params.id,req.body.item_type,req.body.description,req.body.quantity,req.body.unit_price]);
 res.redirect('/billing/'+req.params.id);
}));
router.post('/:id/payments', requireRole('admin','staff'), asyncHandler(async(req,res)=>{
 await pool.query(`INSERT INTO payments(bill_id,amount,method,received_by,notes) VALUES($1,$2,$3,$4,$5)`,[req.params.id,req.body.amount,req.body.method,req.session.user.id,req.body.notes]);
 res.redirect('/billing/'+req.params.id);
}));
module.exports=router;
