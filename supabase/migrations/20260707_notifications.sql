-- ── Table notifications : centre de notifications (TTL 24 h, purge lazy) ─────
--  Types : friend_request (demande d'ami), friend_accept (demande acceptée),
--          room_invite (invitation à rejoindre une room).
--  payload jsonb : ex. { "roomId": "ABC123", "roomName": "Ma room" }.
--  Les insertions sont faites côté serveur (service role) — pas de policy INSERT.
CREATE TABLE IF NOT EXISTS notifications (
  id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text        NOT NULL CHECK (type IN ('friend_request', 'friend_accept', 'room_invite')),
  actor_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payload    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  read       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Chacun ne voit que ses propres notifications.
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Marquer comme lu.
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Supprimer ses propres notifications (purge 24 h côté serveur incluse).
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (user_id = auth.uid());
