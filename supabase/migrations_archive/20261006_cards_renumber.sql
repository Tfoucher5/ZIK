-- supabase/migrations/20261006_cards_renumber.sql
-- Numéros de cartes continus avant l'ouverture : le nettoyage du catalogue a
-- supprimé des cartes et laissé des trous (la première carte portait le n° 103).
-- Renumérote 1, 2, 3… dans l'ordre actuel, puis recale le compteur.
-- Rien ne référence le numéro hors de la table (les liens passent par l'id).

alter table public.cards alter column number drop identity if exists;

-- En deux temps pour ne jamais heurter la contrainte unique en cours de route
with ordered as (
  select id, row_number() over (order by number) as n from public.cards
)
update public.cards c set number = -o.n from ordered o where c.id = o.id;
update public.cards set number = -number;

alter table public.cards alter column number add generated always as identity;

do $$
declare v_next int;
begin
  select coalesce(max(number), 0) + 1 into v_next from public.cards;
  execute format('alter table public.cards alter column number restart with %s', v_next);
end;
$$;
