-- supabase/migrations/20260909_visit_sources.sql
-- Mesure de provenance des visiteurs.
--
-- L'instance Umami a été supprimée (coût serveur), il ne reste donc aucune
-- source d'information sur l'origine du trafic : impossible de savoir quel
-- canal d'acquisition fonctionne. Cette table reconstitue le strict minimum
-- utile — d'où viennent les visiteurs — sans réinstaller d'analytics.
--
-- Une seule ligne est écrite par visiteur (cookie `zik_src`, cf. hooks.server.js),
-- pas une par page vue : le volume reste négligeable.
--
-- Aucune donnée personnelle n'est stockée : ni IP, ni user-agent, ni identifiant
-- de visiteur. Les lignes ne sont pas rattachables à une personne, et le cookie
-- ne contient qu'un drapeau sans identifiant.

create table if not exists public.visit_sources (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  medium text not null,
  campaign text,
  referrer_host text,
  landing_path text
);

create index if not exists visit_sources_created_at_idx
  on public.visit_sources (created_at desc);

alter table public.visit_sources enable row level security;
-- Aucune policy : seul le service role (endpoints admin, hook serveur) y accède.

-- Répartition par canal sur une fenêtre glissante.
create or replace function public.admin_traffic_sources(p_days int default 30)
returns table (
  source text,
  medium text,
  n bigint,
  first_seen timestamptz,
  last_seen timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    v.source,
    v.medium,
    count(*) as n,
    min(v.created_at) as first_seen,
    max(v.created_at) as last_seen
  from public.visit_sources v
  where v.created_at >= now() - make_interval(days => p_days)
  group by v.source, v.medium
  order by n desc;
$$;

-- Volume quotidien de nouveaux visiteurs, pour la courbe du dashboard.
create or replace function public.admin_traffic_daily(p_days int default 30)
returns table (day date, n bigint)
language sql
security definer
set search_path = public
as $$
  select
    d::date as day,
    count(v.id) as n
  from generate_series(
    (now() - make_interval(days => p_days - 1))::date,
    now()::date,
    interval '1 day'
  ) as d
  left join public.visit_sources v
    on v.created_at >= d and v.created_at < d + interval '1 day'
  group by d
  order by d;
$$;

-- Pages d'atterrissage les plus fréquentes.
create or replace function public.admin_traffic_landings(p_days int default 30, p_limit int default 10)
returns table (landing_path text, n bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(v.landing_path, '/') as landing_path,
    count(*) as n
  from public.visit_sources v
  where v.created_at >= now() - make_interval(days => p_days)
  group by 1
  order by n desc
  limit p_limit;
$$;

revoke all on function public.admin_traffic_sources(int) from public, anon, authenticated;
revoke all on function public.admin_traffic_daily(int) from public, anon, authenticated;
revoke all on function public.admin_traffic_landings(int, int) from public, anon, authenticated;
