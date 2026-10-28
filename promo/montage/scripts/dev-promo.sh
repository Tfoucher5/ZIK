#!/bin/bash
# Lance l'appli (worktree master) branchée sur la passerelle lecture seule, sans e-mails, push ni paiements.
# 1) node scripts/gateway.mjs   2) bash scripts/dev-promo.sh   → http://127.0.0.1:5173
cd "$(dirname "$0")/../../../../ZIK" || exit 1
export SUPABASE_URL=http://127.0.0.1:54321
export RESEND_API_KEY= STRIPE_SECRET_KEY= VAPID_PRIVATE_KEY= PUBLIC_VAPID_KEY= PUBLIC_TURNSTILE_SITE_KEY=
exec npx vite dev --host 127.0.0.1 --port 5173 --strictPort
