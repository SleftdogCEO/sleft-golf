-- Meetup invites: organizer invites players, they accept/decline
create extension if not exists "uuid-ossp" with schema extensions;

create table if not exists public.meetup_invites (
  id uuid default extensions.uuid_generate_v4() primary key,
  meetup_id uuid references public.meetups(id) on delete cascade not null,
  inviter_id uuid references public.profiles(id) on delete cascade not null,
  invitee_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  responded_at timestamptz,
  unique(meetup_id, invitee_id)
);

alter table public.meetup_invites enable row level security;

create policy "Anyone can read invites" on public.meetup_invites for select using (true);
create policy "Anyone can create invites" on public.meetup_invites for insert with check (true);
create policy "Anyone can update invites" on public.meetup_invites for update using (true) with check (true);
create policy "Anyone can delete invites" on public.meetup_invites for delete using (true);
