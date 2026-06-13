const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');
const seed = require('./seed');

(async () => {
  const schema = fs.readFileSync(path.join(__dirname, '../../sql/schema.sql'), 'utf8');
  await pool.query(schema);
  await seed();
  console.log('Database schema initialized and seed data checked.');
  await pool.end();
})().catch(err => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
