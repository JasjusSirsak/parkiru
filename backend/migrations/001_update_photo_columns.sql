-- Update photo URL columns to TEXT type to handle base64 image data
ALTER TABLE parking_sessions 
ALTER COLUMN entry_photo_url TYPE TEXT,
ALTER COLUMN exit_photo_url TYPE TEXT;
