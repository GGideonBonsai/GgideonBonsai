-- SQL schema for Gideon Bonsai
-- Выполните этот код в Supabase → SQL Editor → New Query → Run

-- ── Species ───────────────────────────────────────────────────────────────────
create table if not exists species (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  name_ru    text not null,
  name_lat   text,
  code       text not null,
  type       text,
  synonyms   text,
  care_code  text,
  created_at timestamptz default now()
);
alter table species enable row level security;
create policy "Users see own species" on species for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Plants ────────────────────────────────────────────────────────────────────
create table if not exists plants (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  species_id     uuid references species(id) on delete cascade,
  number         integer not null default 1,
  status         text default '°',
  check_flags    text[] default '{}',
  short_care     text,
  origin         text,
  bonsai_style   text,
  date_start     date,
  landscape_id   uuid,
  pot_id         uuid,
  variety        text,
  country        text,
  price          numeric,
  qty            integer default 1,
  comment        text,
  main_photo_id  uuid,
  photo_ids      uuid[] default '{}',
  history        jsonb default '[]',
  created_at     timestamptz default now()
);
alter table plants enable row level security;
create policy "Users see own plants" on plants for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Landscapes ────────────────────────────────────────────────────────────────
create table if not exists landscapes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  name       text not null,
  code       text not null,
  light      text,
  temp_min   integer,
  temp_max   integer,
  humidity   text,
  locations  jsonb default '[]',
  created_at timestamptz default now()
);
alter table landscapes enable row level security;
create policy "Users see own landscapes" on landscapes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Pots ─────────────────────────────────────────────────────────────────────
create table if not exists pots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  material   text,
  mat_name   text,
  number     text,
  shape      text,
  prop       text,
  size       text,
  color      text,
  pattern    text,
  code       text,
  created_at timestamptz default now()
);
alter table pots enable row level security;
create policy "Users see own pots" on pots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Tasks ─────────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  type        text,
  target_id   uuid,
  date        date,
  comment     text,
  done        boolean default false,
  created_at  timestamptz default now()
);
alter table tasks enable row level security;
create policy "Users see own tasks" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Photos ────────────────────────────────────────────────────────────────────
create table if not exists photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  plant_id      uuid references plants(id) on delete cascade,
  storage_path  text not null,
  date          date,
  note          text,
  created_at    timestamptz default now()
);
alter table photos enable row level security;
create policy "Users see own photos" on photos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Выполните отдельно в Storage → New Bucket:
-- Название: photos
-- Public: НЕТ (приватный)
