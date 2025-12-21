-- Migração para criar tabelas de Marketing (Disparo em Massa)

-- 1. Tabela de Grupos de Clientes
create table if not exists client_groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- 2. Tabela de Relacionamento Grupo <-> Cliente
create table if not exists client_group_members (
  group_id uuid references client_groups(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  added_at timestamptz default now(),
  primary key (group_id, customer_id)
);

-- 3. Tabela de Campanhas
create table if not exists campaigns (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message_template text,           -- Mensagem original
  message_variations jsonb,        -- Array de variações da mensagem (ex: ["Olá...", "Oi..."])
  image_url text,
  target_group_id uuid references client_groups(id), -- Grupo alvo
  scheduled_at timestamptz,        -- Data/hora agendada para envio
  status text not null default 'draft', -- draft, scheduled, processing, completed, failed
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- 4. Tabela de Mensagens da Campanha (Fila de Envio e Histórico)
create table if not exists campaign_messages (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references campaigns(id) on delete cascade,
  customer_id uuid references customers(id),
  phone text not null,
  status text not null default 'pending', -- pending, sent, failed
  sent_message text,             -- A mensagem exata que foi enviada (qual variação)
  sent_at timestamptz,
  error_message text,
  created_at timestamptz default now()
);

-- 5. RLS Policies (Segurança)
alter table client_groups enable row level security;
alter table client_group_members enable row level security;
alter table campaigns enable row level security;
alter table campaign_messages enable row level security;

-- Permitir tudo para Admin (considerando que o backend usa service role ou politica publica por enquanto para simplificar, como nos outros arquivos)
-- Ajustando conforme padrão do database_setup.sql existente:

create policy "Admin all on client_groups" on client_groups for all using (true);
create policy "Admin all on client_group_members" on client_group_members for all using (true);
create policy "Admin all on campaigns" on campaigns for all using (true);
create policy "Admin all on campaign_messages" on campaign_messages for all using (true);

-- Indexes para performance
create index if not exists idx_campaigns_status on campaigns(status);
create index if not exists idx_campaigns_scheduled on campaigns(scheduled_at);
create index if not exists idx_campaign_messages_campaign on campaign_messages(campaign_id);
create index if not exists idx_campaign_messages_status on campaign_messages(status);
