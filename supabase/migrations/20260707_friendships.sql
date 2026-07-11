-- ── Table friendships : amitiés explicites (demande → acceptation) ───────────
--  Distincte de `follows` (qui reste un suivi asymétrique sans consentement).
--   • pending  = demande envoyée, en attente d'acceptation
--   • accepted = amitié confirmée des deux côtés
--  Sens : requester_id a demandé addressee_id.
CREATE TABLE IF NOT EXISTS friendships (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requester_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  accepted_at  timestamptz,
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS friendships_requester_idx ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships(addressee_id);

-- RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Lecture publique : nécessaire pour compter/afficher les amis sur les profils publics.
CREATE POLICY "friendships_select_all" ON friendships
  FOR SELECT USING (true);

-- On ne peut créer qu'une demande dont on est l'auteur.
CREATE POLICY "friendships_insert_own" ON friendships
  FOR INSERT WITH CHECK (requester_id = auth.uid());

-- Seul le destinataire peut accepter (pending → accepted).
CREATE POLICY "friendships_update_addressee" ON friendships
  FOR UPDATE USING (addressee_id = auth.uid());

-- Chaque partie prenante peut supprimer : annuler sa demande, refuser, ou retirer l'ami.
CREATE POLICY "friendships_delete_own" ON friendships
  FOR DELETE USING (requester_id = auth.uid() OR addressee_id = auth.uid());
