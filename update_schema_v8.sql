-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add customer_id to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policies for customers
CREATE POLICY "Public can insert customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can select customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Public can update customers" ON customers FOR UPDATE USING (true);
CREATE POLICY "Admin can do all on customers" ON customers FOR ALL USING (true);

-- Create index for phone search
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
