-- Add new columns to business_settings
ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS additional_phones TEXT, -- JSON or comma separated
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS button_color TEXT DEFAULT '#EA1D2C',
ADD COLUMN IF NOT EXISTS cart_color TEXT DEFAULT '#1c1917',
ADD COLUMN IF NOT EXISTS social_instagram TEXT,
ADD COLUMN IF NOT EXISTS social_facebook TEXT,
ADD COLUMN IF NOT EXISTS social_youtube TEXT,
ADD COLUMN IF NOT EXISTS social_google TEXT,
ADD COLUMN IF NOT EXISTS simple_hours_text TEXT;

-- Update delivery_zones table
ALTER TABLE delivery_zones
ADD COLUMN IF NOT EXISTS ceps TEXT, -- Comma separated list of CEPs
ADD COLUMN IF NOT EXISTS neighborhoods TEXT; -- Comma separated list of neighborhoods
