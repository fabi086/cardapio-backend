-- 1. Adicionar número sequencial do pedido (01, 02, 03...)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number SERIAL;

-- 2. Habilitar atualizações em tempo real para a tabela de pedidos
-- Isso garante que o status mude automaticamente na tela do cliente
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
