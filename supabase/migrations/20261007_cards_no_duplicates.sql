-- supabase/migrations/20261007_cards_no_duplicates.sql
-- Plus de doublons : une carte se possède une fois. En jeu, un joueur qui l'a
-- déjà la laisse au suivant (serveur). Ici, card_settle n'ajoute plus
-- d'exemplaire, et les compteurs existants reviennent à 1.
-- La colonne user_cards.copies reste, inutilisée, pour ne rien casser.

update public.user_cards set copies = 1 where copies <> 1;

create or replace function public.card_settle(
  p_user_id uuid, p_grant_ids bigint[], p_keep boolean
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  g record;
  v_new boolean;
  v_visible timestamptz;
  v_cards jsonb := '[]'::jsonb;
  v_sets jsonb := '[]'::jsonb;
  s record;
begin
  for g in
    select * from card_grants
     where id = any(p_grant_ids) and user_id = p_user_id and status = 'pending'
     order by id
     for update
  loop
    if not p_keep then
      update card_grants set status = 'lost', settled_at = now() where id = g.id;
      continue;
    end if;

    v_visible := case when g.delayed
      then greatest(now(), (select created_at + interval '24 hours' from profiles where id = p_user_id))
      else now() end;

    insert into user_cards (user_id, card_id, visible_at)
    values (p_user_id, g.card_id, v_visible)
    on conflict (user_id, card_id) do nothing;
    v_new := found;

    update card_grants set status = 'granted', settled_at = now() where id = g.id;
    update cards set first_owner_id = p_user_id, first_owned_at = now()
     where id = g.card_id and first_owner_id is null;

    v_cards := v_cards || jsonb_build_object('card_id', g.card_id, 'is_new', v_new);

    if v_new then
      for s in
        select cs.id, cs.kind, cs.name
          from card_set_items i
          join card_sets cs on cs.id = i.set_id
         where i.card_id = g.card_id
           and cs.card_count >= 3
           and not exists (select 1 from user_card_sets u where u.user_id = p_user_id and u.set_id = cs.id)
           and not exists (
             select 1 from card_set_items i2
              where i2.set_id = cs.id
                and not exists (select 1 from user_cards uc where uc.user_id = p_user_id and uc.card_id = i2.card_id)
           )
      loop
        insert into user_card_sets (user_id, set_id) values (p_user_id, s.id) on conflict do nothing;
        v_sets := v_sets || jsonb_build_object('id', s.id, 'kind', s.kind, 'name', s.name);
      end loop;
    end if;
  end loop;

  return jsonb_build_object('cards', v_cards, 'sets', v_sets);
end;
$$;

revoke all on function public.card_settle(uuid, bigint[], boolean) from public, anon, authenticated;
