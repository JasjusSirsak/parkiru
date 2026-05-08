require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const pool = require('./config/db');

async function migrate() {
  try {
    console.log('Adding last_activity column to users table...');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    console.log('✅ Migration successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
