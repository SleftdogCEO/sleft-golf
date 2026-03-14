-- Player Reviews: rate golfers you've played with
create table public.player_reviews (
  id uuid default gen_random_uuid() primary key,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  reviewee_id uuid references public.profiles(id) on delete cascade not null,
  pace_rating integer not null check (pace_rating >= 1 and pace_rating <= 5),
  etiquette_rating integer not null check (etiquette_rating >= 1 and etiquette_rating <= 5),
  fun_rating integer not null check (fun_rating >= 1 and fun_rating <= 5),
  comment text,
  created_at timestamptz default now(),
  constraint no_self_review check (reviewer_id != reviewee_id),
  unique(reviewer_id, reviewee_id)
);

alter table public.player_reviews enable row level security;

create policy "Reviews are viewable by everyone"
  on public.player_reviews for select using (true);

create policy "Users can create reviews"
  on public.player_reviews for insert with check (auth.uid() = reviewer_id);

create policy "Users can update their own reviews"
  on public.player_reviews for update using (auth.uid() = reviewer_id);

create policy "Users can delete their own reviews"
  on public.player_reviews for delete using (auth.uid() = reviewer_id);
