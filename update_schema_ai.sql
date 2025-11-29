-- Create table for AI Integration Settings
CREATE TABLE IF NOT EXISTS ai_integration_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evolution_api_url TEXT,
    evolution_api_key TEXT,
    openai_api_key TEXT,
    instance_name TEXT,
    system_prompt TEXT DEFAULT 'Você é um assistente virtual de uma pizzaria. Seu objetivo é ajudar os clientes a fazerem pedidos, tirarem dúvidas sobre o cardápio e consultarem o status de seus pedidos. Seja sempre educado e prestativo.',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_integration_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin can do all on ai_integration_settings" ON ai_integration_settings FOR ALL USING (true);
