-- Execute este script no SQL Editor do Supabase para criar o bucket de imagens e corrigir permissões

-- 1. Cria o bucket 'menu-items' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-items', 'menu-items', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Permite acesso público para leitura (necessário para o WhatsApp baixar a imagem)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'menu-items' );

-- 3. Permite upload para qualquer usuário (ou ajuste conforme segurança desejada)
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'menu-items' );

-- 4. Permite update/delete se necessário (opcional)
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'menu-items' );
