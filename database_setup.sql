-- 1. Tabela de Pedidos
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  customer_phone text not null,
  customer_address text,
  payment_method text not null,
  change_for text,
  total decimal(10,2) not null,
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- 2. Tabela de Itens do Pedido
create table if not exists order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,
  quantity int not null,
  price decimal(10,2) not null,
  modifiers jsonb
);

-- 3. Habilitar Segurança (RLS)
alter table orders enable row level security;
alter table order_items enable row level security;

-- 4. Políticas de Acesso (Permissões)

-- Orders: Qualquer um pode criar, Admin vê tudo
create policy "Public can insert orders" on orders for insert with check (true);
create policy "Public can view orders" on orders for select using (true);
create policy "Admin can do all on orders" on orders for all using (true);

-- Order Items: Qualquer um pode criar, Admin vê tudo
create policy "Public can insert order_items" on order_items for insert with check (true);
create policy "Public can view order_items" on order_items for select using (true);
create policy "Admin can do all on order_items" on order_items for all using (true);
