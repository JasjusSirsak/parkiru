-- Add max_capacity column to parking_settings table
ALTER TABLE parking_settings 
ADD COLUMN max_capacity INTEGER DEFAULT 150;

-- Update existing settings to have max_capacity
UPDATE parking_settings 
SET max_capacity = 150 
WHERE max_capacity IS NULL;
