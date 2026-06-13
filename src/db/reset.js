const pool = require('./pool');

(async () => {
  try {
    await pool.query(`
      DROP VIEW IF EXISTS no_doctor_double_booking;
      DROP TABLE IF EXISTS audit_logs CASCADE;
    `);

    console.log("DB reset done");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();