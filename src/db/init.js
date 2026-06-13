const pool = require('./pool');

const init = async () => {
  try {
    console.log("Checking DB state...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT
      );
    `);

    console.log("Users table ready");
  } catch (err) {
    console.error("DB init error:", err);
  }
};

init();