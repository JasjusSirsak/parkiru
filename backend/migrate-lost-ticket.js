require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const pool = require('./config/db');

async function migrate() {
  try {
    console.log('Adding lost_ticket_fine column to parking_settings table...');
    await pool.query('ALTER TABLE parking_settings ADD COLUMN IF NOT EXISTS lost_ticket_fine INTEGER DEFAULT 20000');
    console.log('✅ Migration successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
