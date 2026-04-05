-- Device tokens for push notifications
create table if not exists public.device_tokens (
  id uuid default extensions.uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  token text not null,
  platform text default 'ios' check (platform in ('ios', 'android', 'web')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, platform)
);

alter table public.device_tokens enable row level security;

create policy "Anyone can read tokens" on public.device_tokens for select using (true);
create policy "Anyone can upsert tokens" on public.device_tokens for insert with check (true);
create policy "Anyone can update tokens" on public.device_tokens for update using (true) with check (true);
