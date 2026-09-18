-- The Salty Jellyfish: shared counters across all players.
-- Run once in the Supabase SQL editor. Safe to run again: it replaces itself.
--
-- Design, in plain terms:
--   * One row of totals (global_stats) and one row per device that has ever played
--     (devices). A device is a random ID the game keeps in the browser; no names,
--     emails or shop names are stored.
--   * Both tables are locked: the public key can neither read nor write them directly.
--   * Two functions do all the work. get_stats() returns the totals.
--     record_progress() adds a device's progress since it last reported, with caps so
--     no single request can inflate a counter absurdly.

create table if not exists public.global_stats (
  id                integer primary key default 1 check (id = 1),
  players           bigint  not null default 0,
  shops_opened      bigint  not null default 0,
  books_sold        bigint  not null default 0,
  coins_earned      bigint  not null default 0,
  days_played       bigint  not null default 0,
  boxes_opened      bigint  not null default 0,
  pets_adopted      bigint  not null default 0,
  coats_of_paint    bigint  not null default 0,
  best_shop_sold    bigint  not null default 0,
  updated_at        timestamptz not null default now()
);
insert into public.global_stats (id) values (1) on conflict (id) do nothing;

create table if not exists public.devices (
  device_id   text primary key,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  reports     integer not null default 0
);

-- Lock both tables. With row-level security on and no policies, nobody using the
-- public key can read or change rows directly. Only the functions below can.
alter table public.global_stats enable row level security;
alter table public.devices enable row level security;
revoke all on public.global_stats from anon, authenticated;
revoke all on public.devices from anon, authenticated;

-- Read the totals.
create or replace function public.get_stats()
returns table (
  players bigint, shops_opened bigint, books_sold bigint, coins_earned bigint,
  days_played bigint, boxes_opened bigint, pets_adopted bigint, coats_of_paint bigint,
  best_shop_sold bigint, updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select players, shops_opened, books_sold, coins_earned, days_played, boxes_opened,
         pets_adopted, coats_of_paint, best_shop_sold, updated_at
  from public.global_stats where id = 1;
$$;

-- Add one device's progress since its last report. Every increment is capped, and a
-- device is counted as a player the first time it reports.
create or replace function public.record_progress(
  p_device text,
  p_shops integer default 0,
  p_sold integer default 0,
  p_coins integer default 0,
  p_days integer default 0,
  p_boxes integer default 0,
  p_pets integer default 0,
  p_paint integer default 0,
  p_best integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_new boolean;
begin
  if p_device is null or length(p_device) < 8 or length(p_device) > 64 then
    return;
  end if;

  insert into public.devices (device_id) values (p_device)
  on conflict (device_id) do update set last_seen = now(), reports = public.devices.reports + 1
  returning (xmax = 0) into is_new;

  update public.global_stats set
    players        = players        + case when is_new then 1 else 0 end,
    shops_opened   = shops_opened   + least(greatest(p_shops, 0), 5),
    books_sold     = books_sold     + least(greatest(p_sold, 0), 600),
    coins_earned   = coins_earned   + least(greatest(p_coins, 0), 2000),
    days_played    = days_played    + least(greatest(p_days, 0), 20),
    boxes_opened   = boxes_opened   + least(greatest(p_boxes, 0), 40),
    pets_adopted   = pets_adopted   + least(greatest(p_pets, 0), 3),
    coats_of_paint = coats_of_paint + least(greatest(p_paint, 0), 20),
    best_shop_sold = greatest(best_shop_sold, least(greatest(p_best, 0), 100000)),
    updated_at     = now()
  where id = 1;
end;
$$;

-- The public key may call the two functions, and nothing else.
revoke all on function public.get_stats() from public;
revoke all on function public.record_progress(text, integer, integer, integer, integer, integer, integer, integer, integer) from public;
grant execute on function public.get_stats() to anon, authenticated;
grant execute on function public.record_progress(text, integer, integer, integer, integer, integer, integer, integer, integer) to anon, authenticated;
