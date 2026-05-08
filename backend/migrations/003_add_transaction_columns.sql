-- Migration: Add missing columns to transactions table
-- Date: 2024-01-15
-- Description: Add chargeable_minutes, billable_hours, and ppn_percentage columns

-- Add chargeable_minutes column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS chargeable_minutes INTEGER;

-- Add billable_hours column  
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS billable_hours INTEGER;

-- Add ppn_percentage column
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS ppn_percentage INTEGER DEFAULT 11;

-- Update existing records to have default values
UPDATE transactions 
SET chargeable_minutes = duration_minutes 
WHERE chargeable_minutes IS NULL;

UPDATE transactions 
SET billable_hours = CEIL(duration_minutes::float / 60) 
WHERE billable_hours IS NULL;

UPDATE transactions 
SET ppn_percentage = 11 
WHERE ppn_percentage IS NULL;

-- Make columns not null after setting defaults
ALTER TABLE transactions 
ALTER COLUMN chargeable_minutes SET NOT NULL;

ALTER TABLE transactions 
ALTER COLUMN billable_hours SET NOT NULL;

ALTER TABLE transactions 
ALTER COLUMN ppn_percentage SET NOT NULL;

SELECT 'Migration 003 completed successfully' AS status;
