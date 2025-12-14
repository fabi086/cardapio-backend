-- Atualizar tabela delivery_zones existente
-- A tabela já existe com coluna "active", vamos adicionar as colunas faltantes

-- Adicionar colunas que podem não existir ainda
ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Cidade não informada';
ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS min_order DECIMAL(10,2) DEFAULT 0;
ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS estimated_time TEXT;
ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Atualizar RLS policies
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of active zones" ON delivery_zones;
DROP POLICY IF EXISTS "Allow authenticated to manage zones" ON delivery_zones;

CREATE POLICY "Allow public read of active zones" ON delivery_zones
    FOR SELECT USING (active = true);

CREATE POLICY "Allow authenticated to manage zones" ON delivery_zones
    FOR ALL USING (auth.role() = 'authenticated');

-- Pronto!
