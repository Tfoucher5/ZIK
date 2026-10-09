<script>
  import { getContext } from 'svelte';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import BarChart from '$lib/admin/BarChart.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import LineChart from '$lib/admin/LineChart.svelte';

  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let { data } = $props();
  const days = $derived(data.days);
  let pulse = $state(null);
  let error = $state('');
  let info = $state(null);
  let sheetOpen = $state(false);

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

  const INFO = {
    north: {
      title: 'Étoile polaire',
      what: 'Les parties terminées avec au moins 2 joueurs sur les 7 derniers jours, rooms en ligne et salons confondus. Le graphique montre les semaines du lundi au dimanche, la semaine en cours en pointillés.',
      how: 'Rooms : parties finies avec 2 joueurs ou plus dans game_players. Salons : parties finies avec player_count de 2 ou plus.',
      goal: '60 par semaine. C\'est la preuve que ZIK est joué comme un jeu à plusieurs.',
    },
    activation: {
      title: 'Inscrits qui jouent',
      what: 'Part des inscrits de la période qui ont terminé au moins une partie ou un Zikle.',
      how: 'profiles créés sur la période, avec au moins une ligne game_players ou daily_results.',
      goal: '60 %. En dessous, le premier chantier est ce qui se passe juste après l\'inscription.',
    },
    return: {
      title: 'Reviennent dans la semaine',
      what: 'Part des nouveaux joueurs qui rejouent entre le lendemain et le 7e jour après leur première partie.',
      how: 'Joueurs dont la première partie date de la période (décalée de 7 jours pour leur laisser le temps de revenir), avec une autre partie entre J+1 et J+7.',
      goal: '20 %.',
    },
    host: {
      title: 'Invités devenus hôtes',
      what: 'Estimation de la part des invités de salon qui lancent ensuite leur propre salon.',
      how: 'Salons lancés depuis le bouton « Créer mon salon » de fin de partie, divisés par le nombre d\'invités des salons (joueurs moins l\'hôte).',
      goal: '5 %. C\'est la boucle d\'acquisition la plus naturelle de ZIK.',
    },
    social: {
      title: 'Visiteurs venus des réseaux',
      what: 'Part des nouveaux visiteurs arrivés depuis TikTok, Instagram, Facebook, X ou YouTube.',
      how: 'visit_sources avec medium = social, sur la période.',
      goal: '10 %. Mesure directe de l\'effet des vidéos promo.',
    },
    zikle: {
      title: 'Zikle du jour',
      what: 'Les résultats des joueurs connectés sur le titre du jour, par nombre d\'essais.',
      how: 'daily_results du jour (heure de Paris).',
      goal: 'Entre 50 et 75 % de victoires : assez dur pour être intéressant, assez facile pour donner envie de revenir.',
    },
  };

  function explain(key) {
    info = INFO[key];
    sheetOpen = true;
  }

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

  const MEDIUM = {
    direct: { label: 'Direct', color: 'var(--a-violet)' },
    search: { label: 'Moteurs de recherche', color: 'var(--a-cyan)' },
    social: { label: 'Réseaux sociaux', color: 'var(--a-accent)' },
    referral: { label: 'Autres sites', color: 'var(--a-warn)' },
    campagne: { label: 'IA et campagnes', color: 'var(--a-good)' },
  };
  const dayLabel = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const signupTotal = $derived(data.signups.reduce((n, d) => n + d.n, 0));
  const trafficTotal = $derived(data.traffic.reduce((n, d) => n + d.n, 0));
  const mediumTotal = $derived(data.mediums.reduce((n, m) => n + m.n, 0) || 1);
  const breakdownMax = $derived(Math.max(1, ...data.breakdown.map((w) => w.new_users + w.returning_users + w.resurrected)));

  const fmtPct = (v) => `${String(v).replace('.', ',')} %`;
  const fmtWeek = (w) => new Date(w).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const northBars = $derived(
    (pulse?.north.weeks ?? []).map((w) => ({ label: fmtWeek(w.week), value: w.n })),
  );
</script>

<div class="adm-page">
  <PageHeader title="Chiffres">
    <div class="seg" role="group" aria-label="Période">
      {#each [7, 30, 90] as d (d)}
        <a href="?j={d}" class:on={days === d} aria-current={days === d ? 'page' : undefined}>{d} j</a>
      {/each}
    </div>
  </PageHeader>

  <div class="stack">
    {#if error}
      <p class="msg err">{error}</p>
    {:else if !pulse}
      <p class="msg">Chargement…</p>
    {:else}
      <div class="cols">
        <article class="card north">
          <h2>Étoile polaire <button class="info" type="button" aria-label="Explication" onclick={() => explain('north')}>?</button></h2>
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
          <button class="goal" type="button" onclick={() => explain(g.key)}>
            <span class="g-lbl">{g.label}</span>
            <span class="g-val">{fmtPct(v.pct)}</span>
            <span class="mini"><i class={st.cls} style:width="{Math.min(100, (v.pct / v.target) * 100)}%"></i></span>
            <span class="g-tgt">{v.n} sur {v.of.toLocaleString('fr-FR')} · objectif {v.target} %</span>
            <span class="pill {st.cls}">{st.txt}</span>
          </button>
        {/each}
      </div>

      <article class="card">
        <h2>Zikle du jour <button class="info" type="button" aria-label="Explication" onclick={() => explain('zikle')}>?</button></h2>
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

    <h2 class="a-h2">Audience</h2>
    <div class="a-cols">
      <section class="a-section">
        <div class="a-section-head"><h3>Joueurs actifs par jour</h3><span class="a-muted small">{days} derniers jours</span></div>
        <LineChart points={data.actives.map((d) => ({ label: dayLabel(d.day), value: d.n }))} />
      </section>
      <div class="a-kpis">
        <div class="a-kpi"><span class="a-kpi-label">Aujourd'hui</span><span class="a-kpi-value">{data.audience?.dau ?? '–'}</span><span class="a-kpi-sub">joueurs actifs</span></div>
        <div class="a-kpi"><span class="a-kpi-label">Cette semaine</span><span class="a-kpi-value">{data.audience?.wau ?? '–'}</span><span class="a-kpi-sub">joueurs actifs</span></div>
        <div class="a-kpi"><span class="a-kpi-label">Ce mois</span><span class="a-kpi-value">{data.audience?.mau ?? '–'}</span><span class="a-kpi-sub">joueurs actifs</span></div>
        <div class="a-kpi"><span class="a-kpi-label">Inscriptions</span><span class="a-kpi-value">{signupTotal}</span><span class="a-kpi-sub">sur {days} jours</span></div>
      </div>
    </div>

    <div class="a-cols even">
      <section class="a-section">
        <div class="a-section-head"><h3>Qui joue chaque semaine</h3></div>
        <div class="stack-bars">
          {#each data.breakdown as w (w.week)}
            {@const total = w.new_users + w.returning_users + w.resurrected}
            <div class="sb-row">
              <span class="sb-lbl">{dayLabel(w.week)}</span>
              <span class="sb-bar">
                <i class="new" style:width="{(w.new_users / breakdownMax) * 100}%"></i>
                <i class="ret" style:width="{(w.returning_users / breakdownMax) * 100}%"></i>
                <i class="back" style:width="{(w.resurrected / breakdownMax) * 100}%"></i>
              </span>
              <b>{total}</b>
            </div>
          {/each}
        </div>
        <div class="keys">
          <span><i class="new"></i>Nouveaux</span>
          <span><i class="ret"></i>Fidèles</span>
          <span><i class="back"></i>Revenus après une pause</span>
        </div>
      </section>

      <section class="a-section">
        <div class="a-section-head"><h3>Reviennent-ils ?</h3></div>
        <p class="a-muted small">Part des inscrits de chaque semaine qui rejouent 1, 2, 3 et 4 semaines après.</p>
        <div class="a-table-wrap">
          <table class="a-table cohort">
            <thead><tr><th>Inscrits la semaine du</th><th class="num">Inscrits</th><th class="num">S+1</th><th class="num">S+2</th><th class="num">S+3</th><th class="num">S+4</th></tr></thead>
            <tbody>
              {#each data.cohorts as c (c.cohort_week)}
                <tr>
                  <td>{dayLabel(c.cohort_week)}</td>
                  <td class="num">{c.cohort_size}</td>
                  {#each [c.w1, c.w2, c.w3, c.w4] as v, i (i)}
                    {@const p = c.cohort_size ? Math.round((v / c.cohort_size) * 100) : 0}
                    {@const done = new Date(c.cohort_week).getTime() + (i + 2) * 7 * 86400000 <= Date.now()}
                    <td class="num heat" style:--h={done ? Math.min(1, p / 30) : 0}>{done ? `${p} %` : '·'}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <h2 class="a-h2">D'où viennent les visiteurs</h2>
    <div class="a-cols">
      <section class="a-section">
        <div class="a-section-head"><h3>Visites par jour</h3><span class="a-muted small">{trafficTotal.toLocaleString('fr-FR')} sur {days} jours</span></div>
        <LineChart points={data.traffic.map((d) => ({ label: dayLabel(d.day), value: d.n }))} color="var(--a-cyan)" />
        <div class="medium-bar" aria-hidden="true">
          {#each data.mediums as m (m.medium)}
            <i style:width="{(m.n / mediumTotal) * 100}%" style:background={MEDIUM[m.medium]?.color ?? 'var(--a-dim)'}></i>
          {/each}
        </div>
        <div class="keys">
          {#each data.mediums as m (m.medium)}
            <span><i style:background={MEDIUM[m.medium]?.color ?? 'var(--a-dim)'}></i>{MEDIUM[m.medium]?.label ?? m.medium} <b>{Math.round((m.n / mediumTotal) * 100)} %</b></span>
          {/each}
        </div>
      </section>
      <section class="a-section">
        <div class="a-section-head"><h3>Meilleures sources</h3></div>
        <ul class="ranks">
          {#each data.sources as s (s.source + s.medium)}
            <li>
              <span class="r-name">{s.source}<em>{MEDIUM[s.medium]?.label ?? s.medium}</em></span>
              <span class="a-meter"><i style:width="{(s.n / (data.sources[0]?.n || 1)) * 100}%" style:background={MEDIUM[s.medium]?.color}></i></span>
              <b>{s.n}</b>
            </li>
          {:else}
            <li class="a-muted">Aucune visite enregistrée.</li>
          {/each}
        </ul>
      </section>
    </div>
    <section class="a-section">
      <div class="a-section-head"><h3>Pages d'arrivée</h3></div>
      <ul class="ranks">
        {#each data.landings as l (l.path)}
          <li>
            <a class="r-name" href={l.path} target="_blank" rel="noopener noreferrer">{l.path}</a>
            <span class="a-meter"><i style:width="{(l.n / (data.landings[0]?.n || 1)) * 100}%"></i></span>
            <b>{l.n}</b>
          </li>
        {/each}
      </ul>
    </section>
  </div>
</div>

<Sheet bind:open={sheetOpen} title={info?.title ?? ''}>
  {#if info}
    <dl class="explain">
      <div><dt>Ce que ça mesure</dt><dd>{info.what}</dd></div>
      <div><dt>Comment c'est calculé</dt><dd>{info.how}</dd></div>
      <div><dt>Objectif</dt><dd>{info.goal}</dd></div>
    </dl>
  {/if}
</Sheet>

<style>
  .stack { display: grid; gap: 14px; padding-top: 16px; color: var(--a-fg); }
  .cols { display: grid; gap: 14px; }

  .seg { display: flex; padding: 3px; border: 1px solid var(--a-line); border-radius: 99px; background: var(--a-surface); }
  .seg a {
    padding: 5px 11px;
    border: 0;
    border-radius: 99px;
    background: none;
    color: var(--a-muted);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }
  .seg a.on { background: var(--a-accent); color: #1a0018; }

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
  .keys { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; font-size: 0.82rem; color: var(--a-muted); }
  .keys span { display: inline-flex; align-items: center; gap: 6px; }
  .keys i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; }
  .keys b { color: var(--a-fg); }
  .more { display: inline-block; margin-top: 14px; font-size: 0.85rem; font-weight: 600; color: var(--a-accent); }

  .small { font-size: 0.8rem; }
  .stack-bars { display: grid; gap: 6px; }
  .sb-row { display: grid; grid-template-columns: 56px 1fr 36px; align-items: center; gap: 8px; font-size: 0.8rem; }
  .sb-lbl { color: var(--a-dim); }
  .sb-row b { text-align: right; font-variant-numeric: tabular-nums; }
  .sb-bar { display: flex; height: 14px; border-radius: 4px; background: var(--a-surface2); overflow: hidden; }
  .sb-bar i, .keys i.new, .keys i.ret, .keys i.back { display: block; height: 100%; }
  .new { background: var(--a-accent); }
  .ret { background: var(--a-cyan); }
  .back { background: var(--a-warn); }
  .cohort td.heat { background: rgba(74, 222, 128, calc(var(--h) * 0.45)); }
  .medium-bar { display: flex; gap: 2px; height: 12px; margin-top: 6px; border-radius: 6px; overflow: hidden; }
  .medium-bar i { display: block; height: 100%; }
  .ranks { display: grid; gap: 10px; list-style: none; }
  .ranks li { display: grid; grid-template-columns: minmax(0, 1.2fr) 1fr 44px; align-items: center; gap: 10px; font-size: 0.85rem; }
  .ranks b { text-align: right; font-variant-numeric: tabular-nums; }
  .r-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .r-name em { margin-left: 6px; font-size: 0.72rem; font-style: normal; color: var(--a-dim); }
  a.r-name:hover { color: var(--a-accent); }
  .msg { padding: 24px 0; color: var(--a-muted); }
  .msg.err { color: var(--a-bad); }

  .explain { display: grid; gap: 14px; }
  .explain dt { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--a-accent); }
  .explain dd { max-width: 60ch; margin-top: 2px; line-height: 1.45; }

  @media (min-width: 640px) {
    .goals { grid-template-columns: repeat(4, 1fr); }
  }
  @media (min-width: 1000px) {
    .cols { grid-template-columns: 3fr 2fr; }
  }
</style>
