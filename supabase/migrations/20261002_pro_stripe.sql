-- ZIK Pro : paiement Stripe en ligne.
--
-- stripe_last_session : dernier paiement Stripe traité pour ce compte. Stripe
-- peut renvoyer le même événement plusieurs fois : sans ce garde-fou, un passe
-- Soirée serait prolongé deux fois et les e-mails partiraient en double.

alter table public.pro_subscriptions
  add column if not exists stripe_last_session text;
