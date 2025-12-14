-- Create delivery_zones table for managing neighborhood delivery fees
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS delivery_zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    neighborhood TEXT NOT NULL,
    city TEXT DEFAULT 'Cidade não informada',
    fee DECIMAL(10,2) DEFAULT 0,
    min_order DECIMAL(10,2) DEFAULT 0,
    estimated_time TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_delivery_zones_neighborhood ON delivery_zones(neighborhood);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_city ON delivery_zones(city);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active);

-- Enable RLS
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Create policies for public read (for customers to see delivery fees)
CREATE POLICY "Allow public read of active zones" ON delivery_zones
    FOR SELECT USING (is_active = true);

-- Create policies for authenticated users (admin) to manage zones
CREATE POLICY "Allow authenticated to manage zones" ON delivery_zones
    FOR ALL USING (auth.role() = 'authenticated');

-- Add some example zones (optional - uncomment to use)
-- INSERT INTO delivery_zones (neighborhood, city, fee, min_order, estimated_time) VALUES
--     ('Centro', 'Sua Cidade', 5.00, 20.00, '20-30 min'),
--     ('Vila Nova', 'Sua Cidade', 7.00, 25.00, '30-40 min'),
--     ('Jardim das Flores', 'Sua Cidade', 10.00, 30.00, '40-50 min');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_delivery_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delivery_zones_updated_at ON delivery_zones;
CREATE TRIGGER trigger_delivery_zones_updated_at
    BEFORE UPDATE ON delivery_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_zones_updated_at();
