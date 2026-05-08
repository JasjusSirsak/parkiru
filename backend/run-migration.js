const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Running migration 003...');
    
    // Check if columns exist
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      AND column_name IN ('chargeable_minutes', 'billable_hours', 'ppn_percentage')
    `);
    
    const existingColumns = checkResult.rows.map(r => r.column_name);
    console.log('Existing columns:', existingColumns);
    
    // Add chargeable_minutes if not exists
    if (!existingColumns.includes('chargeable_minutes')) {
      console.log('Adding chargeable_minutes...');
      await client.query('ALTER TABLE transactions ADD COLUMN chargeable_minutes INTEGER');
      await client.query('UPDATE transactions SET chargeable_minutes = duration_minutes WHERE chargeable_minutes IS NULL');
      await client.query('ALTER TABLE transactions ALTER COLUMN chargeable_minutes SET NOT NULL');
    }
    
    // Add billable_hours if not exists
    if (!existingColumns.includes('billable_hours')) {
      console.log('Adding billable_hours...');
      await client.query('ALTER TABLE transactions ADD COLUMN billable_hours INTEGER');
      await client.query('UPDATE transactions SET billable_hours = CEIL(duration_minutes::float / 60) WHERE billable_hours IS NULL');
      await client.query('ALTER TABLE transactions ALTER COLUMN billable_hours SET NOT NULL');
    }
    
    // Add ppn_percentage if not exists
    if (!existingColumns.includes('ppn_percentage')) {
      console.log('Adding ppn_percentage...');
      await client.query('ALTER TABLE transactions ADD COLUMN ppn_percentage INTEGER DEFAULT 11');
      await client.query('UPDATE transactions SET ppn_percentage = 11 WHERE ppn_percentage IS NULL');
      await client.query('ALTER TABLE transactions ALTER COLUMN ppn_percentage SET NOT NULL');
    }
    
    console.log('✅ Migration 003 completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
