-- Calendar availability table
create table if not exists availability (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  status text check (status in ('open', 'closed')) not null default 'open',
  note text,
  created_at timestamptz default now() not null,
  unique(user_id, date)
);

-- RLS
alter table availability enable row level security;

create policy "Anyone can view availability"
  on availability for select using (true);

create policy "Users can insert own availability"
  on availability for insert with check (auth.uid() = user_id);

create policy "Users can update own availability"
  on availability for update using (auth.uid() = user_id);

create policy "Users can delete own availability"
  on availability for delete using (auth.uid() = user_id);

-- Index for fast lookups by date range
create index idx_availability_date on availability (date);
create index idx_availability_user_date on availability (user_id, date);
