-- Create customer_addresses table for multiple delivery addresses per customer
-- Allows saving different addresses (Casa, Trabalho, etc.) for the same customer

CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    label TEXT DEFAULT 'Casa', -- Casa, Trabalho, Outro
    address TEXT NOT NULL,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    cep TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- Policies for public access (same as customers table)
CREATE POLICY "Public can insert addresses" ON customer_addresses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can select addresses" ON customer_addresses FOR SELECT USING (true);
CREATE POLICY "Public can update addresses" ON customer_addresses FOR UPDATE USING (true);
CREATE POLICY "Public can delete addresses" ON customer_addresses FOR DELETE USING (true);

-- Index for faster lookups by customer
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);

-- Migrate existing addresses from customers table (optional - run once)
-- This creates an entry for each customer that has address data
INSERT INTO customer_addresses (customer_id, label, address, street, number, complement, neighborhood, city, state, cep, is_default)
SELECT 
    id, 
    'Principal', 
    COALESCE(address, ''),
    street,
    number,
    complement,
    neighborhood,
    city,
    state,
    cep,
    true
FROM customers 
WHERE address IS NOT NULL AND address != ''
ON CONFLICT DO NOTHING;
