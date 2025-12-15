-- Programa de Fidelidade - Loyalty Program
-- Adiciona sistema de pontos para clientes

-- 1. Adicionar coluna de pontos na tabela customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0;

-- 2. Criar tabela de histórico de transações de pontos
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'bonus', 'adjustment')),
    points INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela de recompensas disponíveis
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('discount_percent', 'discount_fixed', 'free_item', 'free_delivery')),
    reward_value DECIMAL(10,2), -- Porcentagem ou valor fixo
    product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Para free_item
    is_active BOOLEAN DEFAULT true,
    usage_limit INTEGER, -- NULL = ilimitado
    times_used INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar tabela de resgates realizados
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    points_spent INTEGER NOT NULL,
    discount_applied DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- Policies para loyalty_transactions
DROP POLICY IF EXISTS "Public can view own transactions" ON loyalty_transactions;
CREATE POLICY "Public can view own transactions" ON loyalty_transactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can manage transactions" ON loyalty_transactions;
CREATE POLICY "Authenticated can manage transactions" ON loyalty_transactions FOR ALL USING (true);

-- Policies para loyalty_rewards  
DROP POLICY IF EXISTS "Public can view active rewards" ON loyalty_rewards;
CREATE POLICY "Public can view active rewards" ON loyalty_rewards FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Authenticated can manage rewards" ON loyalty_rewards;
CREATE POLICY "Authenticated can manage rewards" ON loyalty_rewards FOR ALL USING (true);

-- Policies para loyalty_redemptions
DROP POLICY IF EXISTS "Public can view own redemptions" ON loyalty_redemptions;
CREATE POLICY "Public can view own redemptions" ON loyalty_redemptions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can manage redemptions" ON loyalty_redemptions;
CREATE POLICY "Authenticated can manage redemptions" ON loyalty_redemptions FOR ALL USING (true);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order ON loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_customer ON loyalty_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_active ON loyalty_rewards(is_active) WHERE is_active = true;
