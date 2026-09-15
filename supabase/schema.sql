-- ============================================================
-- LUMIÈRE — Supabase schema  (Phase 1: ordering-system foundation)
-- Run this WHOLE file in Supabase → SQL Editor → New query → Run.
-- Safe to re-run (idempotent: create if not exists / drop-create policies).
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. EXISTING PUBLIC-FORM TABLES
-- ============================================================

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text not null,
  guests text not null,
  date date not null,
  time text not null,
  requests text,
  status text not null default 'pending',      -- pending | confirmed | seated | cancelled | no_show
  -- Phase 5 additions (reservation + deposit + pre-order):
  table_id uuid,
  deposit_amount numeric(10,2) not null default 0,
  deposit_status text not null default 'none',  -- none | pending | paid | applied | forfeited | refunded
  pre_order jsonb,                              -- [{menu_item_id, qty}]
  arrival_eta timestamptz,
  stripe_payment_intent text
);
-- add columns if table pre-existed from the old schema
alter table public.reservations add column if not exists table_id uuid;
alter table public.reservations add column if not exists deposit_amount numeric(10,2) not null default 0;
alter table public.reservations add column if not exists deposit_status text not null default 'none';
alter table public.reservations add column if not exists pre_order jsonb;
alter table public.reservations add column if not exists arrival_eta timestamptz;
alter table public.reservations add column if not exists stripe_payment_intent text;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  handled boolean not null default false
);

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null unique
);

-- Legacy "order ahead" table (kept for the public /order page).
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  email text not null,
  phone text not null,
  items jsonb not null,
  total numeric(10,2) not null,
  notes text,
  status text not null default 'received'       -- received | preparing | ready | completed
);

-- Live restaurant settings (single row, id=1) edited from /admin/settings.
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  restaurant_name text not null default 'Lumière',
  tagline text not null default 'International Fine Dining',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  hours text not null default '',
  currency text not null default '₹',
  deposit_amount numeric(10,2) not null default 500,
  service_charge_pct numeric(5,2) not null default 0,
  payment_gateway text not null default 'razorpay',
  accepting_orders boolean not null default true
);

-- Guest dish ratings + loyalty (returning-guests).
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  phone text not null unique,
  name text,
  visits int not null default 0,
  last_visit_at timestamptz
);

-- ============================================================
-- 2. MENU (moved out of static menu.ts → DB-editable, sold-out toggle)
-- ============================================================
create table if not exists public.menu_items (
  id text primary key,                          -- slug e.g. 'coq-au-vin'
  title text not null,
  cuisine text not null,                        -- France | Italy | Japan | India | Spain | Patisserie
  price numeric(10,2) not null,                 -- set to your ₹ prices in admin
  image text not null,
  short text not null,
  description text not null,
  tags text[] not null default '{}',
  badge text,
  rating numeric(2,1) not null default 5.0,
  reviews int not null default 0,
  prep_minutes int not null default 15,         -- drives the customer ETA
  available boolean not null default true,      -- kitchen "86 / sold out" toggle
  sort int not null default 0
);
-- Phase-5 columns: dietary filters + spice level + pairing/origin (optional)
alter table public.menu_items add column if not exists dietary text[] not null default '{}';
alter table public.menu_items add column if not exists spice int not null default 0;
alter table public.menu_items add column if not exists wine_pairing text;
alter table public.menu_items add column if not exists origin text;

-- ============================================================
-- 3. TABLES / QR
-- ============================================================
create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  label text not null unique,                   -- 'T1', 'T2', ...
  token uuid not null default gen_random_uuid() unique,  -- goes in the QR URL /t/<token>
  seats int not null default 2,
  state text not null default 'free',           -- free | reserved | occupied | bill_pending
  current_session_id uuid
);

-- ============================================================
-- 4. DINING SESSIONS  (one open "tab" per seating)
-- ============================================================
create table if not exists public.dining_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  table_id uuid not null references public.restaurant_tables(id) on delete cascade,
  customer_name text,
  phone text,
  guests int not null default 1,
  status text not null default 'open',          -- open | bill_pending | paid | closed
  payment_method text,                          -- cash | online
  payment_status text not null default 'unpaid',-- unpaid | paid
  tip numeric(10,2) not null default 0,
  receipt_code text unique
);

-- Dish ratings: placed AFTER menu_items & dining_sessions to ensure FK resolution on fresh DB install
create table if not exists public.dish_ratings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  menu_item_id text not null references public.menu_items(id) on delete cascade,
  session_id uuid references public.dining_sessions(id) on delete set null,
  rating int not null check (rating between 1 and 5)
);

-- ============================================================
-- 5. SESSION ORDERS  (each "round" of ordering appends here)
-- ============================================================
create table if not exists public.session_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid not null references public.dining_sessions(id) on delete cascade,
  items jsonb not null,                         -- [{menu_item_id, title, price, qty, notes}]
  amount numeric(10,2) not null,               -- server-computed, never trusted from client
  notes text,
  kind text not null default 'dine_in',         -- dine_in | pre_order
  status text not null default 'placed'         -- placed | accepted | preparing | ready | served
);

-- ============================================================
-- 6. SERVICE REQUESTS  (the call-waiter feature)
-- ============================================================
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  table_id uuid not null references public.restaurant_tables(id) on delete cascade,
  session_id uuid,
  type text not null,                           -- waiter | water | bill
  status text not null default 'open'           -- open | ack | done
);

-- ============================================================
-- 7. PAYMENT SYSTEM INFRASTRUCTURE (Phase 1 Foundation)
-- ============================================================

-- 7A. PAYMENT INTENTS (Prepared before opening gateway UI)
create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  purpose text not null check (purpose in ('dine_in_bill', 'reservation_deposit')),
  session_id uuid references public.dining_sessions(id) on delete restrict,
  reservation_id uuid references public.reservations(id) on delete restrict,
  table_token uuid,
  expected_amount numeric(10,2) not null check (expected_amount > 0),
  currency text not null default 'INR',
  tip_amount numeric(10,2) not null default 0,
  provider text not null check (provider in ('stripe', 'razorpay')),
  provider_order_id text,
  client_secret text,
  status text not null default 'created' check (
    status in ('created', 'processing', 'succeeded', 'failed', 'cancelled', 'expired')
  ),
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_payment_intents_session on public.payment_intents(session_id);
create index if not exists idx_payment_intents_reservation on public.payment_intents(reservation_id);
create index if not exists idx_payment_intents_provider_order on public.payment_intents(provider, provider_order_id);

-- 7B. PAYMENTS (Authoritative Settle Records)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  intent_id uuid references public.payment_intents(id) on delete restrict,
  session_id uuid references public.dining_sessions(id) on delete set null,
  reservation_id uuid references public.reservations(id) on delete set null,
  provider text not null default 'stripe',
  provider_order_id text,
  provider_payment_id text,
  stripe_payment_intent text,
  amount numeric(10,2) not null default 0,
  paid_amount numeric(10,2) not null default 0,
  currency text not null default 'inr',
  payment_method_type text,
  status text not null default 'paid',
  receipt_code text,
  constraint uq_provider_payment_id unique (provider, provider_payment_id)
);

create index if not exists idx_payments_session on public.payments(session_id);
create index if not exists idx_payments_reservation on public.payments(reservation_id);

-- 7C. WEBHOOK EVENTS (Idempotency & Audit Log)
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  provider text not null check (provider in ('stripe', 'razorpay')),
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processed', 'ignored', 'failed')),
  error_message text,
  processed_at timestamptz,
  constraint uq_provider_event_id unique (provider, event_id)
);

-- 7D. PAYMENT REFUNDS (Financial Refund Ledger)
create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  session_id uuid references public.dining_sessions(id) on delete set null,
  reservation_id uuid references public.reservations(id) on delete set null,
  provider text not null check (provider in ('stripe', 'razorpay', 'cash')),
  provider_refund_id text not null,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'INR',
  reason text,
  status text not null default 'succeeded' check (status in ('pending', 'succeeded', 'failed')),
  created_by uuid,
  constraint uq_provider_refund_id unique (provider, provider_refund_id)
);

-- ============================================================
-- 8. ROW LEVEL SECURITY
--    Anonymous customers NEVER touch tables directly — they go through
--    the SECURITY DEFINER rpc functions in section 9. Only authenticated
--    staff get direct table access. Public forms keep anon INSERT.
-- ============================================================
alter table public.reservations       enable row level security;
alter table public.messages           enable row level security;
alter table public.subscribers        enable row level security;
alter table public.orders             enable row level security;
alter table public.menu_items         enable row level security;
alter table public.restaurant_tables  enable row level security;
alter table public.dining_sessions    enable row level security;
alter table public.session_orders     enable row level security;
alter table public.service_requests   enable row level security;
alter table public.payments           enable row level security;
alter table public.payment_intents   enable row level security;
alter table public.webhook_events     enable row level security;
alter table public.payment_refunds    enable row level security;
alter table public.app_settings       enable row level security;
alter table public.customers          enable row level security;
alter table public.dish_ratings       enable row level security;

-- public forms: anon may INSERT
drop policy if exists "public insert reservations" on public.reservations;
drop policy if exists "public insert messages"     on public.messages;
drop policy if exists "public insert subscribers"  on public.subscribers;
drop policy if exists "public insert orders"       on public.orders;
create policy "public insert reservations" on public.reservations for insert to anon, authenticated with check (true);
create policy "public insert messages"     on public.messages     for insert to anon, authenticated with check (true);
create policy "public insert subscribers"  on public.subscribers  for insert to anon, authenticated with check (true);
create policy "public insert orders"       on public.orders       for insert to anon, authenticated with check (true);

-- dish ratings: anyone may rate + read aggregate (trending badges)
drop policy if exists "public insert dish_ratings" on public.dish_ratings;
drop policy if exists "public read dish_ratings"   on public.dish_ratings;
create policy "public insert dish_ratings" on public.dish_ratings for insert to anon, authenticated with check (true);
create policy "public read dish_ratings"   on public.dish_ratings for select to anon, authenticated using (true);

-- menu: anyone may READ (needed to render the public menu); only staff may write
drop policy if exists "public read menu" on public.menu_items;
drop policy if exists "staff write menu" on public.menu_items;
create policy "public read menu" on public.menu_items for select to anon, authenticated using (true);
create policy "staff write menu" on public.menu_items for all to authenticated using (true) with check (true);

-- staff (authenticated) full access to operational tables
do $$
declare t text;
begin
  foreach t in array array[
    'reservations','messages','subscribers','orders',
    'restaurant_tables','dining_sessions','session_orders',
    'service_requests','payments','payment_intents',
    'webhook_events','payment_refunds','app_settings','customers'
  ] loop
    execute format('drop policy if exists "staff all %1$s" on public.%1$s;', t);
    execute format('create policy "staff all %1$s" on public.%1$s for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================
-- 9. SECURE RPCs  (anonymous customer surface — price-safe)
--    Marked SECURITY DEFINER so they bypass RLS in a controlled way.
-- ============================================================

-- resolve a QR token → table (or null)
create or replace function public.resolve_table(p_token uuid)
returns table(id uuid, label text, seats int, state text)
language sql security definer set search_path = public as $$
  select id, label, seats, state from public.restaurant_tables where token = p_token;
$$;

-- get the current open session for a table + its orders + running total
create or replace function public.get_session(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_table restaurant_tables; v_sess dining_sessions; v_orders jsonb; v_reqs jsonb;
begin
  select * into v_table from restaurant_tables where token = p_token;
  if not found then return null; end if;
  select * into v_sess from dining_sessions
    where table_id = v_table.id and status in ('open','bill_pending')
    order by created_at desc limit 1;
  if not found then
    return jsonb_build_object('table', to_jsonb(v_table) - 'token', 'session', null, 'orders', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(to_jsonb(o) order by o.created_at), '[]'::jsonb) into v_orders
    from session_orders o where o.session_id = v_sess.id;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]'::jsonb) into v_reqs
    from service_requests r where r.session_id = v_sess.id and r.status <> 'done';
  return jsonb_build_object(
    'table', to_jsonb(v_table) - 'token',
    'session', to_jsonb(v_sess),
    'orders', v_orders,
    'requests', v_reqs
  );
end $$;

-- place an order (opens a session on first order). Prices are re-read from
-- menu_items — the client's prices are ignored, so totals cannot be forged.
create or replace function public.place_order(
  p_token uuid, p_items jsonb, p_customer text default null,
  p_phone text default null, p_notes text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_table restaurant_tables; v_sess dining_sessions;
  v_item jsonb; v_mi menu_items; v_qty int;
  v_line jsonb; v_lines jsonb := '[]'::jsonb; v_amount numeric(10,2) := 0;
begin
  select * into v_table from restaurant_tables where token = p_token;
  if not found then raise exception 'invalid table'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'empty order'; end if;

  -- find or open the session
  select * into v_sess from dining_sessions
    where table_id = v_table.id and status in ('open','bill_pending')
    order by created_at desc limit 1;
  if not found then
    insert into dining_sessions(table_id, customer_name, phone)
      values (v_table.id, p_customer, p_phone) returning * into v_sess;
    update restaurant_tables set state='occupied', current_session_id=v_sess.id where id=v_table.id;
  end if;

  -- build the line items from trusted DB prices
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_mi from menu_items where id = (v_item->>'menu_item_id');
    if not found then raise exception 'unknown item %', v_item->>'menu_item_id'; end if;
    if not v_mi.available then raise exception '% is sold out', v_mi.title; end if;
    v_qty := greatest(1, coalesce((v_item->>'qty')::int, 1));
    v_amount := v_amount + v_mi.price * v_qty;
    v_line := jsonb_build_object(
      'menu_item_id', v_mi.id, 'title', v_mi.title,
      'price', v_mi.price, 'qty', v_qty, 'notes', v_item->>'notes'
    );
    v_lines := v_lines || v_line;
  end loop;

  insert into session_orders(session_id, items, amount, notes)
    values (v_sess.id, v_lines, v_amount, p_notes);

  return get_session(p_token);
end $$;

-- call a waiter / request water / ask for the bill
create or replace function public.call_service(p_token uuid, p_type text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_table restaurant_tables; v_sess dining_sessions;
begin
  if p_type not in ('waiter','water','bill') then raise exception 'bad type'; end if;
  select * into v_table from restaurant_tables where token = p_token;
  if not found then raise exception 'invalid table'; end if;
  select * into v_sess from dining_sessions
    where table_id=v_table.id and status in ('open','bill_pending')
    order by created_at desc limit 1;
  insert into service_requests(table_id, session_id, type)
    values (v_table.id, v_sess.id, p_type);
  if p_type = 'bill' and found then
    update dining_sessions set status='bill_pending' where id=v_sess.id;
    update restaurant_tables set state='bill_pending' where id=v_table.id;
  end if;
end $$;

-- Atomic Settlement RPC for payment intents (SERVER-ONLY via service_role)
create or replace function public.settle_payment_intent_atomic(
  p_intent_id uuid,
  p_provider_payment_id text,
  p_paid_amount numeric,
  p_currency text,
  p_payment_method_type text default 'online',
  p_provider text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_intent payment_intents;
  v_sess dining_sessions;
  v_table restaurant_tables;
  v_res reservations;
  v_code text;
  v_payment_id uuid;
begin
  -- 1. Lock payment intent for update
  select * into v_intent from payment_intents where id = p_intent_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Payment intent not found');
  end if;

  -- Idempotency check: if intent is already succeeded, return existing receipt
  if v_intent.status = 'succeeded' then
    select receipt_code into v_code from payments where intent_id = v_intent.id;
    return jsonb_build_object('ok', true, 'status', 'already_settled', 'receipt_code', v_code);
  end if;

  -- 2. Validate provider, amount and currency against stored payment intent
  if p_provider is not null and lower(p_provider) <> lower(v_intent.provider) then
    return jsonb_build_object('ok', false, 'error', 'Provider mismatch');
  end if;

  if p_paid_amount < v_intent.expected_amount then
    update payment_intents set status = 'failed', failure_reason = 'Underpaid amount' where id = v_intent.id;
    return jsonb_build_object('ok', false, 'error', 'Underpaid amount');
  end if;

  if upper(p_currency) <> upper(v_intent.currency) then
    return jsonb_build_object('ok', false, 'error', 'Currency mismatch');
  end if;

  -- 3. Generate unique receipt code
  v_code := 'LM-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  -- 4. Execute settlement based on purpose (authoritative provider taken from v_intent)
  if v_intent.purpose = 'dine_in_bill' then
    -- Lock table & session rows
    select * into v_sess from dining_sessions where id = v_intent.session_id for update;
    select * into v_table from restaurant_tables where id = v_sess.table_id for update;

    -- Update session and table
    update dining_sessions set
      status = 'paid', payment_status = 'paid', payment_method = p_payment_method_type,
      tip = v_intent.tip_amount, receipt_code = v_code, closed_at = now()
    where id = v_sess.id;

    update restaurant_tables set state = 'free', current_session_id = null where id = v_table.id;

    -- Log payment using authoritative intent provider
    insert into payments (
      intent_id, session_id, provider, provider_order_id, provider_payment_id,
      stripe_payment_intent, amount, paid_amount, currency, payment_method_type, status, receipt_code
    ) values (
      v_intent.id, v_sess.id, v_intent.provider, v_intent.provider_order_id, p_provider_payment_id,
      p_provider_payment_id, p_paid_amount, p_paid_amount, v_intent.currency, p_payment_method_type, 'paid', v_code
    ) returning id into v_payment_id;

  elsif v_intent.purpose = 'reservation_deposit' then
    -- Lock reservation row
    select * into v_res from reservations where id = v_intent.reservation_id for update;

    update reservations set
      deposit_status = 'paid', status = 'confirmed'
    where id = v_res.id;

    insert into payments (
      intent_id, reservation_id, provider, provider_order_id, provider_payment_id,
      stripe_payment_intent, amount, paid_amount, currency, payment_method_type, status, receipt_code
    ) values (
      v_intent.id, v_res.id, v_intent.provider, v_intent.provider_order_id, p_provider_payment_id,
      p_provider_payment_id, p_paid_amount, p_paid_amount, v_intent.currency, p_payment_method_type, 'paid', v_code
    ) returning id into v_payment_id;
  end if;

  -- 5. Mark intent as succeeded
  update payment_intents set status = 'succeeded', updated_at = now() where id = v_intent.id;

  return jsonb_build_object(
    'ok', true,
    'payment_id', v_payment_id,
    'receipt_code', v_code
  );
end $$;

-- lock down + expose the rpcs
revoke all on function public.resolve_table(uuid) from public;
revoke all on function public.get_session(uuid) from public;
revoke all on function public.place_order(uuid,jsonb,text,text,text) from public;
revoke all on function public.call_service(uuid,text) from public;
revoke all on function public.settle_payment_intent_atomic(uuid,text,numeric,text,text,text) from public, anon, authenticated;
grant execute on function public.resolve_table(uuid) to anon, authenticated;
grant execute on function public.get_session(uuid) to anon, authenticated;
grant execute on function public.place_order(uuid,jsonb,text,text,text) to anon, authenticated;
grant execute on function public.call_service(uuid,text) to anon, authenticated;
grant execute on function public.settle_payment_intent_atomic(uuid,text,numeric,text,text,text) to service_role;

-- loyalty: register a visit for a returning guest (anon-safe, price-safe)
create or replace function public.touch_customer(p_phone text, p_name text default null)
returns table(visits int, name text)
language plpgsql security definer set search_path = public as $$
declare v_cust customers;
begin
  if p_phone is null or p_phone = '' then return; end if;
  select * into v_cust from customers where phone = p_phone;
  if not found then
    insert into customers(phone, name, visits, last_visit_at) values (p_phone, p_name, 1, now());
    return query select 1::int as visits, p_name::text as name;
  else
    update customers set visits = visits + 1, last_visit_at = now(), name = coalesce(p_name, name) where phone = p_phone;
    return query select (v_cust.visits + 1)::int as visits, coalesce(v_cust.name, p_name)::text as name;
  end if;
end $$;
revoke all on function public.touch_customer(text,text) from public;
grant execute on function public.touch_customer(text,text) to anon, authenticated;

-- ============================================================
-- 10. REALTIME  (staff Kitchen Display subscribes to these)
-- ============================================================
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.session_orders'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.dining_sessions'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.service_requests'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.restaurant_tables'; exception when others then null; end;
end $$;

-- ============================================================
-- 11. SEED — menu (placeholder prices; edit to ₹ in admin) + 12 tables
-- ============================================================
insert into public.menu_items (id,title,cuisine,price,image,short,description,tags,badge,rating,reviews,prep_minutes,sort,dietary,spice) values
('coq-au-vin','Coq au Vin','France',32,'/img/menu/1.jpg','Free-range chicken braised in aged Burgundy, lardons & pommes purée','Free-range chicken slow-braised in aged Burgundy with smoked lardons, pearl onions and wild mushrooms, finished with a velouté of pan juices and served with silky pommes purée.','{Signature,Burgundy,Slow-Cooked}','Signature',4.9,128,35,10,'{Non-Vegetarian}',0),
('boeuf-bourguignon','Bœuf Bourguignon','France',38,'/img/menu/1.jpg','48-hour braised short rib, red-wine reduction, glazed roots','Short rib braised for 48 hours in Pinot Noir with a mirepoix of glazed root vegetables, smoked bacon and a deeply reduced red-wine jus.','{Beef,Classic}',null,4.8,74,40,20,'{Non-Vegetarian}',0),
('risotto-tartufo','Risotto al Tartufo','Italy',36,'/img/menu/2.jpg','Carnaroli rice, aged Parmigiano & shaved Alba white truffle','Carnaroli rice from the Po Valley slowly mantecato with aged Parmigiano-Reggiano, finished tableside with freshly shaved Alba white truffle and a whisper of brown butter.','{Vegetarian,"Alba Truffle","Chef''s Table"}','Seasonal',4.8,95,25,30,'{Vegetarian}',0),
('tagliatelle-ragu','Tagliatelle al Ragù','Italy',26,'/img/menu/2.jpg','Hand-rolled tagliatelle, slow Bolognese, Parmigiano','Hand-rolled egg tagliatelle bound in a slow-cooked Bolognese of beef and pork, San Marzano tomato and soffritto, showered with aged Parmigiano.','{Pasta,Classic}',null,4.7,61,20,40,'{Non-Vegetarian}',0),
('wagyu-nigiri','A5 Wagyu Nigiri Selection','Japan',48,'/img/menu/3.jpg','A5 Miyazaki wagyu seared over binchōtan, aged nikiri soy & gold leaf','Five pieces of hand-pressed nigiri crowned with A5 Miyazaki wagyu, lightly seared over binchōtan, brushed with aged nikiri soy and a touch of fresh wasabi and gold leaf.','{"A5 Wagyu",Omakase,"Chef''s Pick"}','Most Loved',5.0,210,20,50,'{Non-Vegetarian,Seafood}',0),
('black-cod','Miso Black Cod','Japan',42,'/img/menu/3.jpg','72-hour saikyo-miso marinated cod, pickled ginger','Black cod marinated for 72 hours in sweet saikyo miso, grilled until caramelised and served with hajikami pickled ginger and a yuzu glaze.','{Seafood,Signature}',null,4.9,88,25,60,'{Non-Vegetarian,Seafood}',0),
('rogan-josh','Kashmiri Rogan Josh','India',29,'/img/menu/4.jpg','Slow-cooked Herdwick lamb, fragrant Kashmiri gravy, saffron & sheermal','Slow-cooked Herdwick lamb shoulder in a fragrant Kashmiri gravy of ratan jot, fennel and Kashmiri chilli, finished with saffron and served with hand-rolled sheermal.','{Slow-Cooked,Kashmiri,Aromatic}',null,4.8,74,40,70,'{Non-Vegetarian}',3),
('dal-makhani','Dal Makhani','India',18,'/img/menu/4.jpg','Black lentils simmered overnight, cultured butter & cream','Whole black urad lentils simmered overnight over gentle heat with tomato, ginger and a generous finish of cultured butter and cream.','{Vegetarian,Comfort}',null,4.7,52,20,80,'{Vegetarian}',1),
('paella-valenciana','Paella Valenciana','Spain',34,'/img/menu/6.jpg','Bomba rice, saffron, Carabineros prawns, clams & golden socarrat','Bomba rice cooked over open flame in a traditional paellera with saffron, Carabineros prawns, clams, mussels and confit chicken, finished with a crown of golden socarrat.','{Wood-Fired,Saffron,"Chef''s Pick"}','Chef''s Pick',4.9,88,45,90,'{Non-Vegetarian,Seafood}',1),
('gambas-ajillo','Gambas al Ajillo','Spain',19,'/img/menu/6.jpg','Sizzling garlic prawns, guindilla chilli, Manzanilla','Plump prawns sizzled in Arbequina olive oil with sliced garlic, guindilla chilli and a splash of Manzanilla sherry, served bubbling in terracotta.','{Seafood,Tapas}',null,4.8,40,15,100,'{Non-Vegetarian,Seafood}',2),
('creme-brulee','Crème Brûlée à la Vanille','Patisserie',14,'/img/menu/5.jpg','Madagascar vanilla custard, caramelised sugar crust & sablé','Silken Madagascar vanilla-bean custard beneath a crackling caramelised sugar crust, torched to order and served with a shortbread sablé and macerated summer berries.','{Sweet,Vanilla,Classic}','Classic',4.9,56,15,110,'{Vegetarian}',0),
('tarte-tatin','Tarte Tatin','Patisserie',15,'/img/menu/5.jpg','Caramelised apple, puff pastry, crème fraîche','Orchard apples caramelised in salted butter caramel, baked beneath buttery puff pastry and turned out warm with a quenelle of Normandy crème fraîche.','{Sweet,Warm}',null,4.8,47,15,120,'{Vegetarian}',0)
on conflict (id) do nothing;

insert into public.restaurant_tables (label, seats)
select 'T'||g, case when g <= 6 then 2 when g <= 10 then 4 else 6 end
from generate_series(1,12) g
on conflict (label) do nothing;

-- single settings row drives /admin/settings
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- 12. Create your admin/staff login:
--   Dashboard → Authentication → Users → Add user (email + password).
--   That login unlocks /admin and (later) /kitchen.
-- ============================================================
