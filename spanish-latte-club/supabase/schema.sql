create extension if not exists "pgcrypto";

create table if not exists public.friend_invites (
  email text primary key check (email = lower(email)),
  display_name text not null,
  initials text not null check (char_length(initials) between 1 and 3),
  avatar_color text not null default '#7b3f2b',
  created_at timestamptz not null default now()
);

create or replace function public.prevent_more_than_three_invites()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.friend_invites where email <> new.email) >= 3 then
    raise exception 'YAM is limited to exactly 3 invited friends.';
  end if;

  return new;
end;
$$;

drop trigger if exists friend_invites_limit on public.friend_invites;
create trigger friend_invites_limit
before insert on public.friend_invites
for each row
execute function public.prevent_more_than_three_invites();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  initials text not null check (char_length(initials) between 1 and 3),
  avatar_color text not null default '#7b3f2b',
  created_at timestamptz not null default now()
);

create table if not exists public.cafes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  city text not null,
  area text not null,
  notes text not null default '',
  visit_date date not null default current_date,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  overall numeric(3, 1) not null check (overall >= 1 and overall <= 10),
  sweetness smallint not null check (sweetness between 1 and 5),
  coffee_strength smallint not null check (coffee_strength between 1 and 5),
  price_value smallint not null check (price_value between 1 and 5),
  creaminess smallint not null check (creaminess between 1 and 5),
  comment text not null default '',
  visit_date date not null default current_date,
  would_order_again boolean not null default true,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cafe_id, user_id)
);

create index if not exists cafes_created_by_idx on public.cafes(created_by);
create index if not exists cafes_area_idx on public.cafes(area);
create index if not exists cafes_visit_date_idx on public.cafes(visit_date desc);
create index if not exists ratings_cafe_id_idx on public.ratings(cafe_id);
create index if not exists ratings_user_id_idx on public.ratings(user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cafes_touch_updated_at on public.cafes;
create trigger cafes_touch_updated_at
before update on public.cafes
for each row
execute function public.touch_updated_at();

drop trigger if exists ratings_touch_updated_at on public.ratings;
create trigger ratings_touch_updated_at
before update on public.ratings
for each row
execute function public.touch_updated_at();

create or replace function public.is_club_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_friend public.friend_invites%rowtype;
begin
  select *
  into invited_friend
  from public.friend_invites
  where email = lower(new.email);

  if invited_friend.email is null then
    raise exception 'YAM is invite-only.';
  end if;

  insert into public.profiles (
    id,
    email,
    display_name,
    initials,
    avatar_color
  )
  values (
    new.id,
    lower(new.email),
    invited_friend.display_name,
    invited_friend.initials,
    invited_friend.avatar_color
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = excluded.display_name,
    initials = excluded.initials,
    avatar_color = excluded.avatar_color;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.friend_invites enable row level security;
alter table public.cafes enable row level security;
alter table public.ratings enable row level security;

drop policy if exists "Club members can read profiles" on public.profiles;
create policy "Club members can read profiles"
on public.profiles
for select
to authenticated
using (public.is_club_member());

drop policy if exists "Members can update their own profile" on public.profiles;
create policy "Members can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Club members can read cafes" on public.cafes;
create policy "Club members can read cafes"
on public.cafes
for select
to authenticated
using (public.is_club_member());

drop policy if exists "Club members can add cafes" on public.cafes;
create policy "Club members can add cafes"
on public.cafes
for insert
to authenticated
with check (public.is_club_member() and created_by = auth.uid());

drop policy if exists "Cafe creators can update cafes" on public.cafes;
create policy "Cafe creators can update cafes"
on public.cafes
for update
to authenticated
using (public.is_club_member() and created_by = auth.uid())
with check (public.is_club_member() and created_by = auth.uid());

drop policy if exists "Cafe creators can delete cafes" on public.cafes;
create policy "Cafe creators can delete cafes"
on public.cafes
for delete
to authenticated
using (public.is_club_member() and created_by = auth.uid());

drop policy if exists "Club members can read ratings" on public.ratings;
create policy "Club members can read ratings"
on public.ratings
for select
to authenticated
using (public.is_club_member());

drop policy if exists "Members create only their own ratings" on public.ratings;
create policy "Members create only their own ratings"
on public.ratings
for insert
to authenticated
with check (public.is_club_member() and user_id = auth.uid());

drop policy if exists "Members update only their own ratings" on public.ratings;
create policy "Members update only their own ratings"
on public.ratings
for update
to authenticated
using (public.is_club_member() and user_id = auth.uid())
with check (public.is_club_member() and user_id = auth.uid());

drop policy if exists "Members delete only their own ratings" on public.ratings;
create policy "Members delete only their own ratings"
on public.ratings
for delete
to authenticated
using (public.is_club_member() and user_id = auth.uid());

create or replace view public.cafe_scores
with (security_invoker = true)
as
select
  cafes.id as cafe_id,
  count(ratings.id)::int as rating_count,
  round(avg(ratings.overall)::numeric, 1) as average_score,
  case
    when count(ratings.id) < 3 then 'Awaiting'
    when avg(ratings.overall) >= 9 then 'S'
    when avg(ratings.overall) >= 8 then 'A'
    when avg(ratings.overall) >= 7 then 'B'
    when avg(ratings.overall) >= 6 then 'C'
    else 'D'
  end as tier
from public.cafes
left join public.ratings on ratings.cafe_id = cafes.id
group by cafes.id;

insert into storage.buckets (id, name, public)
values ('latte-photos', 'latte-photos', true)
on conflict (id) do nothing;

drop policy if exists "Club members can read latte photos" on storage.objects;
create policy "Club members can read latte photos"
on storage.objects
for select
to authenticated
using (bucket_id = 'latte-photos' and public.is_club_member());

drop policy if exists "Members can upload latte photos" on storage.objects;
create policy "Members can upload latte photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'latte-photos' and owner = auth.uid());

drop policy if exists "Members update own latte photos" on storage.objects;
create policy "Members update own latte photos"
on storage.objects
for update
to authenticated
using (bucket_id = 'latte-photos' and owner = auth.uid())
with check (bucket_id = 'latte-photos' and owner = auth.uid());

drop policy if exists "Members delete own latte photos" on storage.objects;
create policy "Members delete own latte photos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'latte-photos' and owner = auth.uid());

-- These internal login emails power the name + password sign-in screen.
-- Create matching Supabase Auth users for each friend with their own password.
delete from public.friend_invites
where email not in (
  'yassine@yam.club',
  'aziz@yam.club',
  'mariam@yam.club'
);

insert into public.friend_invites (email, display_name, initials, avatar_color)
values
  ('yassine@yam.club', 'Yassine', 'YA', '#7b3f2b'),
  ('aziz@yam.club', 'Aziz', 'AZ', '#b8752f'),
  ('mariam@yam.club', 'Mariam', 'MA', '#47624f')
on conflict (email) do update
set
  display_name = excluded.display_name,
  initials = excluded.initials,
  avatar_color = excluded.avatar_color;
