-- Le lien titre → carte n'était exécutable que par anon : avec un compte
-- connecté, la lecture des titres d'une playlist (création de soirée, room)
-- échouait en 42501.
grant execute on function catalog.cards(catalog.tracks) to authenticated;
grant execute on function public.cards(public.tracks) to authenticated;
