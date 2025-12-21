-- Migration: Add paused column to products table
-- Allows pausing a product regardless of stock status

ALTER TABLE products ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT false;
