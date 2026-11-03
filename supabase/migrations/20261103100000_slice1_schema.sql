-- Slice 1 schema for Amanillon.
-- Do not apply this to the hosted project from CI or the agent;
-- the owner will apply it.

create extension if not exists pgcrypto;

create type public.approach as enum ('conservative', 'aggressive');
create type public.trading_style as enum ('intraday', 'swing', 'positional');
create type public.prep_status as enum ('preparing', 'draft', 'active');
create type public.usage_status as enum ('live', 'not_using');
create type public.account_type as enum ('demo', 'live', 'prop');
create type public.asset_class as enum ('forex', 'metal', 'energy', 'index', 'crypto', 'stock', 'futures');
create type public.direction as enum ('long', 'short');
create type public.risk_mode as enum ('amount', 'percent');
create type public.trade_status as enum (
  'entry_planned',
  'entry_placed',
  'entry_triggered',
  'entry_cancelled',
  'entry_missed',
  'trade_sl_hit',
  'trade_close_with_profit',
  'trade_exit_in_mid'
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Kolkata',
  base_currency text not null default 'USD',
  drawdown_line_r numeric not null default -5,
  created_at timestamptz not null default now()
);

create table public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  account_type public.account_type not null default 'demo',
  size numeric(18, 2) not null,
  currency text not null default 'USD',
  allowed_risk_pct numeric(5, 2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.symbols (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  asset_class public.asset_class not null,
  is_futures boolean not null default false,
  contract_size numeric not null,
  lot_step numeric not null default 0.01,
  calc_currency text not null
);

create table public.user_symbol_settings (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  symbol_id uuid not null references public.symbols on delete cascade,
  contract_size numeric not null,
  primary key (user_id, symbol_id)
);

create table public.playbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  approach public.approach,
  trading_style public.trading_style,
  setup_types text[] not null default '{}',
  confluences text[] not null default '{}',
  htf text[] not null default '{}',
  intermediate_tf text[] not null default '{}',
  entry_tf text[] not null default '{}',
  checklist text,
  entry_criteria text,
  exit_criteria text,
  sl_management text,
  risk_per_trade_pct numeric(5, 2),
  avg_planned_rr numeric(6, 2),
  planned_r_per_year numeric(8, 2),
  prep_status public.prep_status not null default 'draft',
  usage_status public.usage_status not null default 'not_using',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_requires_active check (usage_status <> 'live' or prep_status = 'active')
);

create table public.playbook_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  playbook_id uuid not null references public.playbooks on delete cascade,
  storage_path text not null,
  sort smallint not null default 0
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid references public.trading_accounts on delete set null,
  playbook_id uuid references public.playbooks on delete restrict,
  playbook_snapshot jsonb not null,
  symbol_id uuid references public.symbols,
  direction public.direction not null,
  status public.trade_status not null,
  htf text[] not null default '{}',
  entry_tf text[] not null default '{}',
  entry numeric not null,
  stop_loss numeric not null,
  take_profit numeric,
  exit_price numeric,
  quantity numeric not null,
  risk_mode public.risk_mode,
  risk_value numeric,
  risk_amount numeric,
  contract_size_used numeric,
  fx_rate_used numeric default 1,
  planned_rr numeric,
  actual_rr numeric,
  pnl_gross numeric,
  reasoning text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  closing_evidence_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trades_user_status_idx on public.trades (user_id, status);
create index trades_user_opened_idx on public.trades (user_id, opened_at desc);
create index playbooks_user_status_idx on public.playbooks (user_id, prep_status, usage_status);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.enforce_playbook_rules()
returns trigger
language plpgsql
as $$
begin
  if new.usage_status = 'live' and new.prep_status <> 'active' then
    raise exception 'Only an Active playbook can go Live';
  end if;

  if new.prep_status = 'active' then
    if coalesce(btrim(new.name), '') = ''
       or coalesce(btrim(new.checklist), '') = ''
       or coalesce(btrim(new.entry_criteria), '') = ''
       or coalesce(btrim(new.exit_criteria), '') = ''
       or coalesce(btrim(new.sl_management), '') = ''
       or new.risk_per_trade_pct is null
       or new.avg_planned_rr is null
       or new.planned_r_per_year is null
    then
      raise exception 'Active playbooks require every required field';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists playbooks_enforce_rules on public.playbooks;
create trigger playbooks_enforce_rules
  before insert or update on public.playbooks
  for each row execute function public.enforce_playbook_rules();

create or replace function public.enforce_playbook_image_limit()
returns trigger
language plpgsql
as $$
declare
  image_count integer;
begin
  select count(*) into image_count
  from public.playbook_images
  where playbook_id = new.playbook_id;

  if image_count >= 5 then
    raise exception 'A playbook can have at most 5 evidence images';
  end if;
  return new;
end;
$$;

drop trigger if exists playbook_images_limit on public.playbook_images;
create trigger playbook_images_limit
  before insert on public.playbook_images
  for each row execute function public.enforce_playbook_image_limit();

create or replace function public.recompute_trade_metrics()
returns trigger
language plpgsql
as $$
declare
  dir numeric;
  stop numeric;
begin
  dir := case when new.direction = 'long' then 1 else -1 end;
  stop := abs(new.entry - new.stop_loss);
  new.updated_at := now();

  if stop = 0 then
    new.planned_rr := null;
    new.actual_rr := null;
    new.pnl_gross := null;
    return new;
  end if;

  if new.take_profit is not null then
    new.planned_rr := round(((new.take_profit - new.entry) * dir) / stop, 2);
  else
    new.planned_rr := null;
  end if;

  if new.exit_price is not null then
    new.actual_rr := round(((new.exit_price - new.entry) * dir) / stop, 2);
    new.pnl_gross := (new.exit_price - new.entry) * dir * new.quantity
      * coalesce(new.contract_size_used, 1)
      * coalesce(new.fx_rate_used, 1);
  else
    new.actual_rr := null;
    new.pnl_gross := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trades_recompute_metrics on public.trades;
create trigger trades_recompute_metrics
  before insert or update on public.trades
  for each row execute function public.recompute_trade_metrics();

alter table public.profiles enable row level security;
alter table public.trading_accounts enable row level security;
alter table public.symbols enable row level security;
alter table public.user_symbol_settings enable row level security;
alter table public.playbooks enable row level security;
alter table public.playbook_images enable row level security;
alter table public.trades enable row level security;

create policy "own_select" on public.profiles for select using (id = auth.uid());
create policy "own_insert" on public.profiles for insert with check (id = auth.uid());
create policy "own_update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "own_delete" on public.profiles for delete using (id = auth.uid());

create policy "own_select" on public.trading_accounts for select using (user_id = auth.uid());
create policy "own_insert" on public.trading_accounts for insert with check (user_id = auth.uid());
create policy "own_update" on public.trading_accounts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_delete" on public.trading_accounts for delete using (user_id = auth.uid());

create policy "authenticated_select" on public.symbols
  for select to authenticated using (true);

create policy "own_select" on public.user_symbol_settings for select using (user_id = auth.uid());
create policy "own_insert" on public.user_symbol_settings for insert with check (user_id = auth.uid());
create policy "own_update" on public.user_symbol_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_delete" on public.user_symbol_settings for delete using (user_id = auth.uid());

create policy "own_select" on public.playbooks for select using (user_id = auth.uid());
create policy "own_insert" on public.playbooks for insert with check (user_id = auth.uid());
create policy "own_update" on public.playbooks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_delete" on public.playbooks for delete using (user_id = auth.uid());

create policy "own_select" on public.playbook_images for select using (user_id = auth.uid());
create policy "own_insert" on public.playbook_images for insert with check (user_id = auth.uid());
create policy "own_update" on public.playbook_images for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_delete" on public.playbook_images for delete using (user_id = auth.uid());

create policy "own_select" on public.trades for select using (user_id = auth.uid());
create policy "own_insert" on public.trades for insert with check (user_id = auth.uid());
create policy "own_update" on public.trades for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_delete" on public.trades for delete using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'playbook-evidence',
  'playbook-evidence',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "playbook_evidence_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'playbook-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "playbook_evidence_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'playbook-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "playbook_evidence_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'playbook-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'playbook-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "playbook_evidence_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'playbook-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

insert into public.symbols (code, name, asset_class, is_futures, contract_size, lot_step, calc_currency)
values
  ('EURUSD', 'Euro / US Dollar', 'forex', false, 100000, 0.01, 'USD'),
  ('GBPUSD', 'British Pound / US Dollar', 'forex', false, 100000, 0.01, 'USD'),
  ('USDJPY', 'US Dollar / Japanese Yen', 'forex', false, 100000, 0.01, 'JPY'),
  ('USDCHF', 'US Dollar / Swiss Franc', 'forex', false, 100000, 0.01, 'CHF'),
  ('AUDUSD', 'Australian Dollar / US Dollar', 'forex', false, 100000, 0.01, 'USD'),
  ('USDCAD', 'US Dollar / Canadian Dollar', 'forex', false, 100000, 0.01, 'CAD'),
  ('NZDUSD', 'New Zealand Dollar / US Dollar', 'forex', false, 100000, 0.01, 'USD'),
  ('EURGBP', 'Euro / British Pound', 'forex', false, 100000, 0.01, 'GBP'),
  ('EURJPY', 'Euro / Japanese Yen', 'forex', false, 100000, 0.01, 'JPY'),
  ('GBPJPY', 'British Pound / Japanese Yen', 'forex', false, 100000, 0.01, 'JPY'),
  ('GBPAUD', 'British Pound / Australian Dollar', 'forex', false, 100000, 0.01, 'AUD'),
  ('EURCAD', 'Euro / Canadian Dollar', 'forex', false, 100000, 0.01, 'CAD'),
  ('AUDJPY', 'Australian Dollar / Japanese Yen', 'forex', false, 100000, 0.01, 'JPY'),
  ('EURAUD', 'Euro / Australian Dollar', 'forex', false, 100000, 0.01, 'AUD'),
  ('EURCHF', 'Euro / Swiss Franc', 'forex', false, 100000, 0.01, 'CHF'),
  ('XAUUSD', 'Gold', 'metal', false, 100, 0.01, 'USD'),
  ('XAGUSD', 'Silver', 'metal', false, 5000, 0.01, 'USD'),
  ('XPTUSD', 'Platinum', 'metal', false, 100, 0.01, 'USD'),
  ('XPDUSD', 'Palladium', 'metal', false, 100, 0.01, 'USD'),
  ('WTI', 'Crude Oil WTI', 'energy', false, 1000, 0.01, 'USD'),
  ('BRENT', 'Brent Crude', 'energy', false, 1000, 0.01, 'USD'),
  ('XNGUSD', 'Natural Gas', 'energy', false, 10000, 0.01, 'USD'),
  ('US30', 'Dow Jones 30', 'index', false, 1, 0.01, 'USD'),
  ('US100', 'Nasdaq 100', 'index', false, 1, 0.01, 'USD'),
  ('US500', 'S&P 500', 'index', false, 1, 0.01, 'USD'),
  ('GER40', 'DAX 40', 'index', false, 1, 0.01, 'EUR'),
  ('UK100', 'FTSE 100', 'index', false, 1, 0.01, 'GBP'),
  ('JP225', 'Nikkei 225', 'index', false, 1, 0.01, 'JPY'),
  ('BTCUSD', 'Bitcoin', 'crypto', false, 1, 0.01, 'USD'),
  ('ETHUSD', 'Ethereum', 'crypto', false, 1, 0.01, 'USD')
on conflict (code) do nothing;
