-- Slice 2: trade close/review, evidence, status history, insights snapshots.
-- Do not apply this to the hosted project from CI or the agent.

alter table public.trades
  add column if not exists notes text;

create table if not exists public.trade_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  trade_id uuid not null references public.trades on delete cascade,
  kind text not null check (kind in ('setup', 'reference', 'closing')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trade_status_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  trade_id uuid not null references public.trades on delete cascade,
  from_status public.trade_status,
  to_status public.trade_status not null,
  changed_at timestamptz not null default now()
);

create table if not exists public.trade_reviews (
  trade_id uuid primary key references public.trades on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  checklist jsonb not null default '[]',
  emotions text[] not null default '{}',
  mistakes text[] not null default '{}',
  lessons text,
  rating smallint check (rating is null or (rating between 1 and 5)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.score_snapshots (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  period text not null,
  score numeric,
  tier text,
  metrics jsonb,
  computed_at timestamptz not null default now(),
  primary key (user_id, period)
);

create or replace function public.enforce_trade_image_limits()
returns trigger
language plpgsql
as $$
declare
  image_count integer;
  max_allowed integer;
begin
  max_allowed := case new.kind
    when 'setup' then 2
    when 'reference' then 5
    when 'closing' then 1
  end;

  select count(*) into image_count
  from public.trade_images
  where trade_id = new.trade_id and kind = new.kind;

  if image_count >= max_allowed then
    raise exception 'Too many % images for this trade', new.kind;
  end if;
  return new;
end;
$$;

drop trigger if exists trade_images_limit on public.trade_images;
create trigger trade_images_limit
  before insert on public.trade_images
  for each row execute function public.enforce_trade_image_limits();

create or replace function public.log_trade_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.trade_status_history (user_id, trade_id, from_status, to_status)
    values (new.user_id, new.id, case when tg_op = 'INSERT' then null else old.status end, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists trades_status_history on public.trades;
create trigger trades_status_history
  after insert or update of status on public.trades
  for each row execute function public.log_trade_status_change();

alter table public.trade_images enable row level security;
alter table public.trade_status_history enable row level security;
alter table public.trade_reviews enable row level security;
alter table public.score_snapshots enable row level security;

create policy "own_select" on public.trade_images for select using (user_id = auth.uid());
create policy "own_insert" on public.trade_images for insert with check (user_id = auth.uid());
create policy "own_update" on public.trade_images for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_delete" on public.trade_images for delete using (user_id = auth.uid());

create policy "own_select" on public.trade_status_history for select using (user_id = auth.uid());
create policy "own_insert" on public.trade_status_history for insert with check (user_id = auth.uid());
create policy "own_update" on public.trade_status_history for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_delete" on public.trade_status_history for delete using (user_id = auth.uid());

create policy "own_select" on public.trade_reviews for select using (user_id = auth.uid());
create policy "own_insert" on public.trade_reviews for insert with check (user_id = auth.uid());
create policy "own_update" on public.trade_reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_delete" on public.trade_reviews for delete using (user_id = auth.uid());

create policy "own_select" on public.score_snapshots for select using (user_id = auth.uid());
create policy "own_insert" on public.score_snapshots for insert with check (user_id = auth.uid());
create policy "own_update" on public.score_snapshots for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_delete" on public.score_snapshots for delete using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('trade-images', 'trade-images', false, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('closing-evidence', 'closing-evidence', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "trade_images_select"
  on storage.objects for select to authenticated
  using (bucket_id in ('trade-images', 'closing-evidence') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "trade_images_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('trade-images', 'closing-evidence') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "trade_images_update"
  on storage.objects for update to authenticated
  using (bucket_id in ('trade-images', 'closing-evidence') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('trade-images', 'closing-evidence') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "trade_images_delete"
  on storage.objects for delete to authenticated
  using (bucket_id in ('trade-images', 'closing-evidence') and (storage.foldername(name))[1] = auth.uid()::text);
