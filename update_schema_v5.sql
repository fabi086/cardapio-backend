-- Add new columns to business_settings
ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS favicon_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#EA1D2C',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#1c1917',
ADD COLUMN IF NOT EXISTS opening_hours_schema JSONB DEFAULT '{
  "monday": {"open": "18:00", "close": "23:00", "closed": false},
  "tuesday": {"open": "18:00", "close": "23:00", "closed": false},
  "wednesday": {"open": "18:00", "close": "23:00", "closed": false},
  "thursday": {"open": "18:00", "close": "23:00", "closed": false},
  "friday": {"open": "18:00", "close": "00:00", "closed": false},
  "saturday": {"open": "18:00", "close": "00:00", "closed": false},
  "sunday": {"open": "18:00", "close": "23:00", "closed": false}
}';

-- Create delivery_zones table
CREATE TABLE IF NOT EXISTS delivery_zones (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL, -- Bairro ou Região
    fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    min_order DECIMAL(10,2) DEFAULT 0.00,
    estimated_time TEXT DEFAULT '40-50 min',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS for delivery_zones
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON delivery_zones FOR SELECT USING (true);
CREATE POLICY "Enable all access for authenticated users" ON delivery_zones FOR ALL USING (auth.role() = 'authenticated');
