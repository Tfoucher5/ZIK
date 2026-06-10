import { supabase, getAdminClient } from "./config.js";

// Fail-open : si la table site_settings n'existe pas encore ou si la requête
// échoue, le site reste accessible normalement.

let _cache = { value: null, at: 0 };
const TTL = 15_000;

export async function getMaintenance() {
  if (Date.now() - _cache.at < TTL) return _cache.value;
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "maintenance")
      .single();
    _cache = { value: error ? null : data?.value || null, at: Date.now() };
  } catch {
    _cache = { value: null, at: Date.now() };
  }
  return _cache.value;
}

export async function setMaintenance(enabled, message) {
  const { error } = await getAdminClient()
    .from("site_settings")
    .upsert(
      {
        key: "maintenance",
        value: { enabled: !!enabled, message: message || "" },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
  _cache = {
    value: { enabled: !!enabled, message: message || "" },
    at: Date.now(),
  };
}

export function maintenanceHtml(message) {
  const safe = String(message || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>ZIK — Maintenance en cours</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0d0d15; color: #e5e7eb; font-family: system-ui, sans-serif; text-align: center; padding: 24px; }
  .card { max-width: 480px; }
  .logo { font-size: 2rem; font-weight: 900; color: #fff; margin-bottom: 18px; }
  .logo span { color: #7c3aed; }
  h1 { font-size: 1.4rem; margin: 0 0 12px; }
  p { color: #9ca3af; line-height: 1.6; margin: 0; }
  .msg { margin-top: 18px; padding: 14px 18px; border: 1px solid rgba(124,58,237,.35);
    background: rgba(124,58,237,.08); border-radius: 12px; color: #d1d5db; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">ZIK<span>.</span></div>
    <h1>🔧 Maintenance en cours</h1>
    <p>Le site revient dans quelques minutes. Merci de ta patience&nbsp;!</p>
    ${safe ? `<div class="msg">${safe}</div>` : ""}
  </div>
</body>
</html>`;
}
