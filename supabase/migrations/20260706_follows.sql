-- ── Table follows : abonnements entre joueurs ───────────────────────────────
--  Modèle "follow" asymétrique :
--   • abonnements = les joueurs que JE suis      (follower_id = moi)
--   • abonnés     = les joueurs qui ME suivent   (following_id = moi)
--   • amis        = follow mutuel (A suit B ET B suit A)
CREATE TABLE IF NOT EXISTS follows (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  follower_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS follows_follower_idx  ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows(following_id);

-- RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Lecture publique : nécessaire pour afficher les compteurs et la liste d'amis
-- sur les profils publics.
CREATE POLICY "follows_select_all" ON follows
  FOR SELECT USING (true);

-- On ne peut créer qu'un abonnement dont on est l'auteur.
CREATE POLICY "follows_insert_own" ON follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

-- On ne peut supprimer que ses propres abonnements.
CREATE POLICY "follows_delete_own" ON follows
  FOR DELETE USING (follower_id = auth.uid());
