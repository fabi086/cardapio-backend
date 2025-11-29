-- Add font_family to business_settings
ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter';

-- Update delivery_zones table for CEP ranges
ALTER TABLE delivery_zones
ADD COLUMN IF NOT EXISTS cep_start TEXT,
ADD COLUMN IF NOT EXISTS cep_end TEXT,
ADD COLUMN IF NOT EXISTS excluded_ceps TEXT; -- Comma separated list of excluded CEPs within the range

-- Make neighborhoods and ceps optional (if they were not already)
ALTER TABLE delivery_zones ALTER COLUMN name DROP NOT NULL;
ALTER TABLE delivery_zones ALTER COLUMN name SET DEFAULT 'Zona Personalizada';

-- Add delivery info to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS customer_cep TEXT;
