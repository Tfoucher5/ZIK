<script>
  import { getContext } from 'svelte';

  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let weeks = $state([]);
  let error = $state('');
  let loading = $state(true);

  // Une ligne par indicateur de la revue du lundi (docs/strategie/2026-09-29-audit-et-plan.md §6)
  const GROUPS = [
    {
      title: 'Étoile polaire',
      rows: [
        { key: 'rooms_multi', label: 'Rooms finies à 2 joueurs ou plus' },
        { key: 'salons_multi', label: 'Salons finis à 2 joueurs ou plus' },
      ],
    },
    {
      title: 'Mode salon',
      rows: [
        { key: 'salons_lances', label: 'Salons lancés' },
        { key: 'salons_finis', label: 'Salons finis' },
        { key: 'salons_joueurs_moy', label: 'Joueurs par salon (moyenne)' },
        { key: 'salons_depuis_invitation', label: 'Hôtes venus d\'une invitation' },
      ],
    },
    {
      title: 'Inscriptions',
      rows: [
        { key: 'inscrits', label: 'Inscrits' },
        { key: 'inscrits_salon_invite', label: 'dont fin de partie salon' },
        { key: 'inscrits_salon_setup', label: 'dont page /salon' },
        { key: 'inscrits_room_guest', label: 'dont fin de partie room (invité)' },
      ],
    },
    {
      title: 'Activité',
      rows: [
        { key: 'parties_lancees', label: 'Parties lancées' },
        { key: 'parties_finies', label: 'Parties finies' },
        { key: 'parties_zikle', label: 'Parties Zikle' },
      ],
    },
  ];

  async function load() {
    if (!token) return;
    loading = true;
    const r = await fetch(`/api/admin/kpis?token=${encodeURIComponent(token)}`);
    const d = await r.json();
    if (r.ok) { weeks = d.weeks; error = ''; } else error = d.error;
    loading = false;
  }

  $effect(() => {
    void token;
    load();
  });

  const fmtWeek = (w) => new Date(w).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const num = (v) => (v === null || v === undefined ? '-' : Number(v));

  // Évolution de la dernière semaine complète par rapport à la précédente
  function trend(key) {
    if (weeks.length < 3) return null;
    const a = Number(weeks.at(-3)[key]), b = Number(weeks.at(-2)[key]);
    if (!a && !b) return null;
    if (!a) return { dir: 'up', txt: 'nouveau' };
    const pct = Math.round(((b - a) / a) * 100);
    return { dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat', txt: `${pct > 0 ? '+' : ''}${pct} %` };
  }

  function maxOf(key) {
    return Math.max(1, ...weeks.map((w) => Number(w[key]) || 0));
  }
</script>

<div class="kpi">
  <div class="kpi-head">
    <h1>KPI hebdo</h1>
    <p>Semaines du lundi, 8 dernières. La dernière colonne est la semaine en cours (incomplète) ; l'évolution compare les deux dernières semaines complètes.</p>
  </div>

  {#if loading}
    <p class="kpi-muted">Chargement…</p>
  {:else if error}
    <p class="kpi-error">{error}</p>
  {:else}
    {#each GROUPS as g (g.title)}
      <section class="kpi-group">
        <h2>{g.title}</h2>
        <table>
          <thead>
            <tr>
              <th></th>
              {#each weeks as w, i (w.week)}<th class:now={i === weeks.length - 1}>{fmtWeek(w.week)}</th>{/each}
              <th>Évol.</th>
            </tr>
          </thead>
          <tbody>
            {#each g.rows as row (row.key)}
              {@const t = trend(row.key)}
              {@const max = maxOf(row.key)}
              <tr>
                <td class="kpi-label">{row.label}</td>
                {#each weeks as w, i (w.week)}
                  <td class:now={i === weeks.length - 1}>
                    <span class="kpi-bar" style="--h:{(Number(w[row.key]) || 0) / max}"></span>
                    {num(w[row.key])}
                  </td>
                {/each}
                <td class="kpi-trend {t?.dir ?? ''}">{t?.txt ?? '-'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/each}
  {/if}
</div>

<style>
  .kpi {
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-family: 'Inter', system-ui, sans-serif;
    color: #e2e8f0;
  }
  .kpi-head h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; }
  .kpi-head p, .kpi-muted { margin-top: 6px; font-size: 0.82rem; color: #6b7280; }
  .kpi-error { color: #ef4444; font-size: 0.9rem; }
  .kpi-group {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    padding: 16px 18px;
    overflow-x: auto;
  }
  .kpi-group h2 {
    margin-bottom: 10px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7280;
  }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th, td { padding: 7px 8px; text-align: right; white-space: nowrap; }
  th { font-weight: 500; color: #6b7280; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; }
  td { font-family: 'JetBrains Mono', monospace; border-top: 1px solid rgba(255, 255, 255, 0.05); }
  td.kpi-label { text-align: left; font-family: inherit; color: #cbd5e1; }
  .now { color: #6b7280; }
  td { position: relative; }
  .kpi-bar {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 3px;
    height: calc(var(--h) * 100%);
    background: #6366f1;
    opacity: 0.6;
  }
  .kpi-trend.up { color: #22c55e; }
  .kpi-trend.down { color: #ef4444; }
</style>
