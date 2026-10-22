<script>
  import BarChart from '$lib/components/admin/BarChart.svelte';

  /** Pouls de ZIK : étoile polaire, 7 derniers jours, objectifs et Zikle du jour. */
  let { days, token, onExplain } = $props();

  let pulse = $state(null);
  let error = $state('');

  async function load() {
    if (!token) return;
    const r = await fetch(`/api/admin/pulse?token=${encodeURIComponent(token)}&days=${days}`);
    const d = await r.json();
    if (r.ok) { pulse = d; error = ''; } else error = d.error ?? 'Chargement impossible.';
  }

  $effect(() => {
    void days;
    void token;
    load();
  });

  const GOALS = [
    { key: 'activation', label: 'Inscrits qui jouent une partie' },
    { key: 'return', label: 'Reviennent dans la semaine' },
    { key: 'host', label: 'Invités de salon devenus hôtes' },
    { key: 'social', label: 'Visiteurs venus des réseaux' },
  ];

  function status(g) {
    const r = g.pct / g.target;
    if (r >= 1) return { cls: 'good', txt: 'Atteint' };
    if (r >= 0.6) return { cls: 'warn', txt: 'En bonne voie' };
    return { cls: 'bad', txt: 'En retard' };
  }

  const WEEK = [
    { key: 'signups', label: 'Inscriptions' },
    { key: 'players', label: 'Joueurs actifs' },
    { key: 'games', label: 'Parties jouées' },
    { key: 'zikle', label: 'Joueurs Zikle' },
  ];

  const ZIKLE_COLORS = ['var(--a-good)', '#2fb366', 'var(--a-warn)', '#b7791f', 'var(--a-bad)'];

  const fmtPct = (v) => `${String(v).replace('.', ',')} %`;
  const fmtWeek = (w) => new Date(w).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const northBars = $derived(
    (pulse?.north.weeks ?? []).map((w) => ({ label: fmtWeek(w.week), value: w.n })),
  );
</script>

{#if error}
  <p class="msg err">{error}</p>
{:else if !pulse}
  <p class="msg">Chargement…</p>
{:else}
  <div class="cols">
    <article class="card north">
      <h2>Étoile polaire <button class="info" type="button" aria-label="Explication" onclick={() => onExplain('north')}>?</button></h2>
      <p class="sub">Parties terminées à 2 joueurs ou plus, 7 derniers jours</p>
      <div class="big">
        <strong>{pulse.north.value}</strong>
        <span>sur un objectif de <b>{pulse.north.target}</b> par semaine</span>
      </div>
      <div class="progress"><i style:width="{Math.min(100, (pulse.north.value / pulse.north.target) * 100)}%"></i></div>
      <div class="legend">
        <span>{Math.round((pulse.north.value / pulse.north.target) * 100)} % de l'objectif</span>
        <span class={pulse.north.delta > 0 ? 'up' : pulse.north.delta < 0 ? 'down' : 'flat'}>
          {pulse.north.delta > 0 ? '+' : ''}{pulse.north.delta} vs 7 jours d'avant
        </span>
      </div>
      <div class="chart">
        <BarChart bars={northBars} target={pulse.north.target} partialLast />
      </div>
    </article>

    <article class="card">
      <h2>Les 7 derniers jours</h2>
      <p class="sub">Comparés aux 7 jours d'avant</p>
      <div class="rows">
        {#each WEEK as w (w.key)}
          {@const s = pulse.week[w.key]}
          <div class="row">
            <span>{w.label}</span>
            <b>{s.value.toLocaleString('fr-FR')}</b>
            <span class="delta {s.delta.dir}">
              {#if s.delta.pct === null}nouveau{:else}{s.delta.dir === 'up' ? '▲' : s.delta.dir === 'down' ? '▼' : '='} {Math.abs(s.delta.pct)} %{/if}
            </span>
          </div>
        {/each}
      </div>
    </article>
  </div>

  <div class="goals">
    {#each GOALS as g (g.key)}
      {@const v = pulse.goals[g.key]}
      {@const st = status(v)}
      <button class="goal" type="button" onclick={() => onExplain(g.key)}>
        <span class="g-lbl">{g.label}</span>
        <span class="g-val">{fmtPct(v.pct)}</span>
        <span class="mini"><i class={st.cls} style:width="{Math.min(100, (v.pct / v.target) * 100)}%"></i></span>
        <span class="g-tgt">{v.n} sur {v.of.toLocaleString('fr-FR')} · objectif {v.target} %</span>
        <span class="pill {st.cls}">{st.txt}</span>
      </button>
    {/each}
  </div>

  <article class="card">
    <h2>Zikle du jour <button class="info" type="button" aria-label="Explication" onclick={() => onExplain('zikle')}>?</button></h2>
    <p class="sub">
      {pulse.zikle.track ?? 'Aucun titre programmé'}
      · {pulse.zikle.total} participant{pulse.zikle.total > 1 ? 's' : ''}
    </p>
    {#if pulse.zikle.total > 0}
      <div class="bar" aria-hidden="true">
        {#each pulse.zikle.buckets as b, i (b.label)}
          {#if b.n > 0}<i style:flex={b.n} style:background={ZIKLE_COLORS[i]}></i>{/if}
        {/each}
      </div>
      <div class="keys">
        {#each pulse.zikle.buckets as b, i (b.label)}
          <span><i style:background={ZIKLE_COLORS[i]}></i>{b.label} <b>{b.n}</b></span>
        {/each}
      </div>
    {/if}
    <a class="more" href="/admin/zikle">Gérer le Zikle</a>
  </article>
{/if}

<style>
  .cols { display: grid; gap: 14px; }

  .card { min-width: 0; padding: 16px; border: 1px solid var(--a-line); border-radius: 16px; background: var(--a-surface); }
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    font-family: var(--a-display);
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--a-muted);
  }
  .sub { margin-bottom: 12px; font-size: 0.82rem; color: var(--a-dim); }
  .info {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    margin-left: auto;
    border: 1px solid var(--a-line);
    border-radius: 50%;
    background: none;
    color: var(--a-muted);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
  }

  .north { background: linear-gradient(160deg, #2a0b29 0%, var(--a-surface) 55%); border-color: #3a1838; }
  .big { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; }
  .big strong { font-family: var(--a-display); font-size: 4rem; font-weight: 800; line-height: 0.9; font-variant-numeric: tabular-nums; }
  .big span { color: var(--a-muted); }
  .big b { color: var(--a-fg); }
  .progress { height: 10px; margin: 14px 0 6px; border-radius: 99px; background: var(--a-surface2); overflow: hidden; }
  .progress i { display: block; height: 100%; border-radius: 99px; background: var(--a-accent); }
  .legend { display: flex; justify-content: space-between; gap: 8px; font-size: 0.75rem; color: var(--a-dim); }
  .chart { margin-top: 16px; }

  .rows { display: grid; }
  .row {
    display: grid;
    grid-template-columns: 1fr auto 72px;
    gap: 12px;
    align-items: center;
    padding: 10px 0;
    border-top: 1px solid var(--a-line);
    font-variant-numeric: tabular-nums;
  }
  .row:first-child { border-top: 0; }
  .row b { font-size: 1rem; }
  .delta { font-size: 0.8rem; font-weight: 700; text-align: right; }
  .up { color: var(--a-good); }
  .down { color: var(--a-bad); }
  .flat { color: var(--a-muted); }

  .goals { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .goal {
    display: grid;
    gap: 6px;
    min-width: 0;
    padding: 12px;
    border: 1px solid var(--a-line);
    border-radius: 14px;
    background: var(--a-surface);
    color: var(--a-fg);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .goal:hover { border-color: var(--a-dim); }
  .g-lbl { min-height: 2.5em; font-size: 0.8rem; line-height: 1.25; color: var(--a-muted); }
  .g-val { font-family: var(--a-display); font-size: 2rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
  .g-tgt { font-size: 0.75rem; color: var(--a-dim); }
  .mini { height: 6px; border-radius: 99px; background: var(--a-surface2); overflow: hidden; }
  .mini i { display: block; height: 100%; border-radius: 99px; }
  .mini .good { background: var(--a-good); }
  .mini .warn { background: var(--a-warn); }
  .mini .bad { background: var(--a-bad); }
  .pill { justify-self: start; padding: 2px 8px; border-radius: 99px; font-size: 0.7rem; font-weight: 700; }
  .pill.good { background: var(--a-good-soft); color: var(--a-good); }
  .pill.warn { background: var(--a-warn-soft); color: var(--a-warn); }
  .pill.bad { background: var(--a-bad-soft); color: var(--a-bad); }

  .bar { display: flex; gap: 2px; height: 18px; border-radius: 6px; overflow: hidden; }
  .more { display: inline-block; margin-top: 14px; font-size: 0.85rem; font-weight: 600; color: var(--a-accent); }

  .msg { padding: 24px 0; color: var(--a-muted); }
  .msg.err { color: var(--a-bad); }

  @media (min-width: 640px) {
    .goals { grid-template-columns: repeat(4, 1fr); }
  }
  @media (min-width: 1000px) {
    .cols { grid-template-columns: 3fr 2fr; }
  }
</style>
