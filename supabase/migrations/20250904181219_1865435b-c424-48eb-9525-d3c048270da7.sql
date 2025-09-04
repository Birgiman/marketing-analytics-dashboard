-- Enable required extension for UUID generation
create extension if not exists "pgcrypto";

-- Helper function to auto-update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Owner policies for profiles
create policy "Profiles are viewable by owner"
  on public.profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_profiles_user_id on public.profiles(user_id);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- WHATSAPP INSTANCES TABLE
create table if not exists public.whatsapp_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instance_name text not null unique,
  instance_id text,
  status text not null check (status in ('disconnected','connecting','pending-qr','connected','error')) default 'disconnected',
  qr_code text,
  phone_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_instances enable row level security;

create policy "Users can view their own whatsapp instances"
  on public.whatsapp_instances for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own whatsapp instances"
  on public.whatsapp_instances for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own whatsapp instances"
  on public.whatsapp_instances for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their own whatsapp instances"
  on public.whatsapp_instances for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_whatsapp_instances_user_id on public.whatsapp_instances(user_id);
create index if not exists idx_whatsapp_instances_instance_name on public.whatsapp_instances(instance_name);

create trigger trg_whatsapp_instances_updated_at
before update on public.whatsapp_instances
for each row execute function public.update_updated_at_column();

-- LIVES TABLE
create table if not exists public.lives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  live_date timestamptz,
  captacao_start timestamptz,
  ta_rolando_start timestamptz,
  ta_rolando_end timestamptz,
  participants integer default 0,
  sales integer default 0,
  revenue numeric(12,2) default 0,
  current_viewers integer default 0,
  peak_viewers integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lives enable row level security;

create policy "Users can view their own lives"
  on public.lives for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own lives"
  on public.lives for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own lives"
  on public.lives for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their own lives"
  on public.lives for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_lives_user_id on public.lives(user_id);

create trigger trg_lives_updated_at
before update on public.lives
for each row execute function public.update_updated_at_column();

-- CRIATIVOS TABLE (analytics creatives)
create table if not exists public.criativos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  day text,
  campaign_name text,
  ad_set_name text,
  ad_name text,
  amount_spent numeric(12,2),
  leads integer,
  cost_per_lead numeric(12,2),
  creative_link text,
  created_at timestamptz not null default now()
);

alter table public.criativos enable row level security;

create policy "Users can view their own criativos"
  on public.criativos for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own criativos"
  on public.criativos for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own criativos"
  on public.criativos for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their own criativos"
  on public.criativos for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_criativos_user_id on public.criativos(user_id);

-- GRUPOS TABLE (analytics groups)
create table if not exists public.grupos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  data_hora text,
  data text,
  hora text,
  id_grupo text,
  nome_grupo text,
  telefone text,
  evento text,
  created_at timestamptz not null default now()
);

alter table public.grupos enable row level security;

create policy "Users can view their own grupos"
  on public.grupos for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own grupos"
  on public.grupos for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own grupos"
  on public.grupos for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their own grupos"
  on public.grupos for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_grupos_user_id on public.grupos(user_id);