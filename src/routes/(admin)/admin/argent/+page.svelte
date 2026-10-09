<script>
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import BarChart from '$lib/admin/BarChart.svelte';
  import { ago, euros } from '$lib/admin/stats-utils.js';

  let { data } = $props();

  const PLAN = { night: 'Soirée', monthly: 'Mensuel', yearly: 'Annuel', manual: 'Offert' };
  const now = Date.now();

  const live = (s) => s.status !== 'canceled' && new Date(s.current_period_end).getTime() > now;
  const FILTERS = [
    { key: 'active', label: 'Actifs', test: (s) => live(s) && s.status === 'active' },
    { key: 'past_due', label: 'En échec', test: (s) => s.status === 'past_due' },
    { key: 'ended', label: 'Terminés', test: (s) => !live(s) && s.status !== 'past_due' },
  ];
  let filter = $state('active');

  const subsBy = $derived(Object.fromEntries(FILTERS.map((f) => [f.key, data.subs.filter(f.test)])));
  const byCustomer = $derived(Object.fromEntries(data.subs.filter((s) => s.stripe_customer_id).map((s) => [s.stripe_customer_id, s])));

  const net = (c) => (c.status === 'succeeded' ? c.amount - c.refunded : 0);
  const monthKey = (ts) => new Date(ts).toISOString().slice(0, 7);
  const months = $derived.by(() => {
    const out = [];
    const d = new Date(now);
    for (let i = 5; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      const cents = data.charges.filter((c) => monthKey(c.created) === key).reduce((n, c) => n + net(c), 0);
      out.push({ label: m.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), value: Math.round(cents / 100), cents });
    }
    return out;
  });
  const thisMonth = $derived(months.at(-1).cents);
  const lastMonth = $derived(months.at(-2).cents);

  // Ce que rapportent chaque mois les abonnements en cours
  const mrr = $derived(
    subsBy.active.reduce((n, s) => n + (s.plan === 'monthly' ? 1900 : s.plan === 'yearly' ? 19000 / 12 : 0), 0),
  );
  const failed = $derived(data.charges.filter((c) => c.status === 'failed' && now - c.created < 30 * 86400_000));
  const recent = $derived(data.charges.slice(0, 15));

  const dash = (c, path) => `https://dashboard.stripe.com/${c?.live === false ? 'test/' : ''}${path}`;
  const who = (c) => byCustomer[c.customer]?.username ?? c.email ?? 'Client inconnu';
  const day = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<div class="adm-page">
  <PageHeader title="Argent">
    <a class="a-btn small" href="?refresh">Actualiser</a>
  </PageHeader>

  <div class="a-stack">
    {#if data.stripeError}
      <p class="a-card bad">Stripe ne répond pas : {data.stripeError}</p>
    {/if}

    <div class="a-grid2">
      <div class="a-card kpi">
        <span class="vl">Encaissé ce mois</span>
        <span class="a-big">{euros(thisMonth)}</span>
        <span class="vs">{euros(lastMonth)} le mois dernier</span>
      </div>
      <div class="a-card kpi">
        <span class="vl">Abonnements en cours</span>
        <span class="a-big">{euros(Math.round(mrr))}</span>
        <span class="vs">par mois · {subsBy.active.length} actif{subsBy.active.length > 1 ? 's' : ''}</span>
      </div>
    </div>

    <section class="a-card">
      <h2 class="a-h2">Encaissé par mois (€)</h2>
      <BarChart bars={months} partialLast />
    </section>

    {#if failed.length || subsBy.past_due.length}
      <h2 class="a-h2">Paiements refusés</h2>
      <ul class="a-list">
        {#each subsBy.past_due as s (s.user_id)}
          <li class="a-row bad-row">
            <span class="a-row-main">
              <a class="a-row-title" href="/admin/users/{s.user_id}">{s.username}</a>
              <span class="a-row-sub">{PLAN[s.plan]} · renouvellement refusé, Stripe réessaie</span>
            </span>
            {#if s.stripe_customer_id}<a class="a-btn small" href={dash(null, `customers/${s.stripe_customer_id}`)} target="_blank" rel="noopener noreferrer">Stripe</a>{/if}
          </li>
        {/each}
        {#each failed as c (c.id)}
          <li class="a-row bad-row">
            <span class="a-row-main">
              <span class="a-row-title">{who(c)} · {euros(c.amount)}</span>
              <span class="a-row-sub">{c.failure ?? 'Refusé'} · {ago(c.created)}</span>
            </span>
            <a class="a-btn small" href={dash(c, `payments/${c.id}`)} target="_blank" rel="noopener noreferrer">Stripe</a>
          </li>
        {/each}
      </ul>
    {/if}

    <h2 class="a-h2">Abonnés</h2>
    <div class="a-chips" role="group" aria-label="État des abonnés">
      {#each FILTERS as f (f.key)}
        <button class="a-chip" aria-pressed={filter === f.key} onclick={() => (filter = f.key)}>{f.label}<b>{subsBy[f.key].length}</b></button>
      {/each}
    </div>
    <ul class="a-list">
      {#each subsBy[filter] as s (s.user_id)}
        <li>
          <a class="a-row" href="/admin/users/{s.user_id}">
            <span class="a-row-main">
              <span class="a-row-title">{s.username}</span>
              <span class="a-row-sub">
                {live(s) ? (s.plan === 'night' || s.plan === 'manual' ? "jusqu'au" : 'renouvelé le') : 'fini le'} {day(s.current_period_end)} · depuis le {day(s.created_at)}
              </span>
            </span>
            <em class="a-tag {s.plan === 'manual' ? '' : 'accent'}">{PLAN[s.plan]}</em>
          </a>
        </li>
      {:else}
        <li class="a-empty">Personne ici.</li>
      {/each}
    </ul>
    <p class="hint a-muted">Pour offrir le Pro à quelqu'un, ouvre son profil dans Joueurs.</p>

    <h2 class="a-h2">Derniers paiements</h2>
    <ul class="a-list">
      {#each recent as c (c.id)}
        <li>
          <a class="a-row" href={dash(c, `payments/${c.id}`)} target="_blank" rel="noopener noreferrer">
            <span class="a-row-main">
              <span class="a-row-title">{who(c)}</span>
              <span class="a-row-sub">{ago(c.created)}{c.refunded ? ` · remboursé ${euros(c.refunded)}` : ''}</span>
            </span>
            <b class="amount" class:ko={c.status !== 'succeeded'}>{euros(c.amount)}</b>
            {#if c.status !== 'succeeded'}<em class="a-tag {c.status === 'failed' ? 'bad' : 'warn'}">{c.status === 'failed' ? 'refusé' : 'en cours'}</em>{/if}
          </a>
        </li>
      {:else}
        <li class="a-empty">Aucun paiement sur 6 mois.</li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .kpi { display: grid; gap: 6px; }
  .kpi .a-big { font-size: 1.7rem; }
  .vl { font-size: 0.8rem; font-weight: 600; color: var(--a-muted); }
  .vs { font-size: 0.78rem; color: var(--a-dim); }
  .a-card .a-h2 { margin: 0 0 8px; }
  .bad-row { border-color: rgba(248, 113, 113, 0.4); background: var(--a-bad-soft); }
  .amount { font-variant-numeric: tabular-nums; }
  .amount.ko { color: var(--a-dim); text-decoration: line-through; }
  .hint { font-size: 0.8rem; }
</style>
