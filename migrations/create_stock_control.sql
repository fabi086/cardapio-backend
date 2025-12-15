-- Controle de Estoque - Stock Control
-- Adiciona colunas de estoque na tabela products

-- 1. Adicionar colunas de estoque
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_alert INTEGER DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false;

-- 2. Criar tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'order')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER,
    new_stock INTEGER,
    reason TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Authenticated can manage stock" ON stock_movements;
CREATE POLICY "Authenticated can manage stock" ON stock_movements FOR ALL USING (true);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);

-- Index para produtos com estoque baixo
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(stock_quantity) 
WHERE track_stock = true AND stock_quantity <= low_stock_alert;
