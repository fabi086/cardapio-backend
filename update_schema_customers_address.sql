-- Adicionar colunas de endereço estruturado na tabela customers
-- Mantém a coluna 'address' para compatibilidade com código existente

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Comentários para documentação
COMMENT ON COLUMN customers.street IS 'Nome da rua/logradouro';
COMMENT ON COLUMN customers.number IS 'Número do endereço';
COMMENT ON COLUMN customers.complement IS 'Complemento (apartamento, bloco, etc)';
COMMENT ON COLUMN customers.neighborhood IS 'Bairro';
COMMENT ON COLUMN customers.city IS 'Cidade';
COMMENT ON COLUMN customers.state IS 'Estado (UF)';
COMMENT ON COLUMN customers.address IS 'Endereço completo formatado (gerado automaticamente)';
