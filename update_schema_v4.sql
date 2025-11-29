-- Create business_settings table
CREATE TABLE IF NOT EXISTS business_settings (
    id SERIAL PRIMARY KEY,
    restaurant_name TEXT DEFAULT 'Meu Restaurante',
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    opening_hours TEXT DEFAULT 'Seg-Sex: 18h às 23h',
    delivery_fee_base DECIMAL(10,2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Insert default row if not exists
INSERT INTO business_settings (id, restaurant_name)
SELECT 1, 'Meu Restaurante'
WHERE NOT EXISTS (SELECT 1 FROM business_settings WHERE id = 1);

-- Enable RLS
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON business_settings FOR SELECT USING (true);
CREATE POLICY "Enable update for authenticated users only" ON business_settings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users only" ON business_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
