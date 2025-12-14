-- Migration: Add display mode settings for carousel/grid toggle
-- Run this in Supabase SQL Editor if the migration fails

ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS display_mode VARCHAR(20) DEFAULT 'grid',
ADD COLUMN IF NOT EXISTS products_per_carousel INTEGER DEFAULT 6;

-- Update existing row with default values
UPDATE business_settings 
SET display_mode = 'grid', products_per_carousel = 6 
WHERE display_mode IS NULL;
