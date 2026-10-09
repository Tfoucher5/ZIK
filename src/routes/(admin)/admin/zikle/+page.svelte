<script>
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import ZikleTrackSearch from '$lib/admin/ZikleTrackSearch.svelte';
  import { ago, pct } from '$lib/admin/stats-utils.js';

  let { data, form } = $props();

  const day = (d, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', opts);
  const dec = (n) => (n == null ? '—' : String(n).replace('.', ','));

  const todayRow = $derived(data.days.find((d) => d.date === data.today));
  const past = $derived(data.days.filter((d) => d.date <= data.today));
  const upcoming = $derived(data.days.filter((d) => d.date > data.today));
  const history = $derived(past.filter((d) => d.track || d.players).toReversed());

  const month = $derived.by(() => {
    const players = past.reduce((s, d) => s + d.players, 0);
    const wins = past.reduce((s, d) => s + d.wins, 0);
    const winAttempts = past.reduce((s, d) => s + (d.avgAttempts ?? 0) * d.wins, 0);
    const played = past.filter((d) => d.players).length;
    return {
      players,
      perDay: played ? Math.round((players / past.length) * 10) / 10 : 0,
      winRate: pct(wins, players),
      avgAttempts: wins ? Math.round((winAttempts / wins) * 10) / 10 : null,
    };
  });
  const scheduled = $derived(upcoming.filter((d) => d.track).length);

  let W = $state(600);
  const H = 120;
  let hover = $state(null);
  const maxPlayers = $derived(Math.max(4, ...past.map((d) => d.players)));
  const bw = $derived(W / past.length);
  const y = (v) => H - (v / maxPlayers) * (H - 8);
  const shown = $derived(hover ?? todayRow);

  let sel = $state(null);
  let dayOpen = $state(false);
  let wipeOpen = $state(false);
  let confirmFree = $state(false);
  let busy = $state(false);

  function openDay(d) {
    sel = d;
    confirmFree = false;
    dayOpen = true;
  }

  const submit = () => {
    busy = true;
    return async ({ result, update }) => {
      await update({ reset: false });
      busy = false;
      if (result.type === 'success') {
        dayOpen = false;
        wipeOpen = false;
      }
    };
  };
</script>

<div class="adm-page">
  <PageHeader title="Zikle">
    <a class="a-btn small" href="/admin/zikle/pool">Pool de titres</a>
  </PageHeader>

  <div class="a-stack">
    {#if form?.done}<p class="a-card good">{form.done}</p>{/if}
    {#if form?.error}<p class="a-card bad">{form.error}</p>{/if}

    <div class="a-cols">
      <div>
        <section class="a-section today">
          <div class="a-section-head">
            <h2>Aujourd'hui</h2>
            <span class="a-muted small">{day(data.today, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          {#if todayRow?.track}
            <div class="song">
              {#if todayRow.track.cover_url}<img class="big-cover" src={todayRow.track.cover_url} alt="" />{/if}
              <div class="song-txt">
                <b>{todayRow.track.title}</b>
                <span>{todayRow.track.artist}</span>
              </div>
            </div>
          {:else}
            <p class="a-card warn small">Pas encore de titre : il sera tiré au hasard à la première visite, ou choisis-le maintenant.</p>
          {/if}
          <div class="facts">
            <div><b>{todayRow?.players ?? 0}</b><span>joueurs</span></div>
            <div><b>{pct(todayRow?.wins ?? 0, todayRow?.players ?? 0)} %</b><span>ont trouvé</span></div>
            <div><b>{dec(todayRow?.avgAttempts)}</b><span>essais pour trouver</span></div>
          </div>
          <div class="a-btns">
            {#if todayRow?.track}<a class="a-btn" href="/admin/zikle/{data.today}">Voir les résultats</a>{/if}
            <button class="a-btn" type="button" onclick={() => openDay(todayRow)}>Changer le titre</button>
            {#if todayRow?.players}
              <button class="a-btn danger" type="button" onclick={() => (wipeOpen = true)}>Effacer les résultats</button>
            {/if}
          </div>
        </section>

        <section class="a-section">
          <div class="a-section-head">
            <h2>Participation sur 30 jours</h2>
            <span class="legend"><i class="lg won"></i>trouvé <i class="lg lost"></i>pas trouvé</span>
          </div>
          <p class="readout" aria-live="polite">
            {#if shown}<b>{day(shown.date)}</b> · {shown.players} joueur{shown.players > 1 ? 's' : ''}, {shown.wins} ont trouvé{/if}
          </p>
          <div class="chart" bind:clientWidth={W}>
            <svg viewBox="0 0 {W} {H + 18}" role="img" aria-label="Joueurs par jour sur 30 jours" onpointerleave={() => (hover = null)}>
              <line x1="0" x2={W} y1={H} y2={H} class="axis" />
              {#each past as d, i (d.date)}
                {@const x = i * bw + Math.min(2, bw * 0.15)}
                {@const w = Math.max(2, bw - Math.min(4, bw * 0.3))}
                {@const yWon = y(d.wins)}
                {@const yAll = y(d.players)}
                <g class:on={shown?.date === d.date}>
                  {#if d.players > d.wins}
                    <rect class="lost" {x} y={yAll} width={w} height={Math.max(0, yWon - yAll - (d.wins ? 2 : 0))} rx="2" />
                  {/if}
                  {#if d.wins}
                    <rect class="won" {x} y={yWon} width={w} height={H - yWon} rx="2" />
                  {/if}
                  <rect class="hit" x={i * bw} y="0" width={bw} height={H + 18} role="presentation" onpointerenter={() => (hover = d)} />
                  {#if i % 7 === past.length % 7 - 1 || d.date === data.today}
                    <text x={x + w / 2} y={H + 14} text-anchor="middle">{d.date === data.today ? 'auj.' : day(d.date, { day: 'numeric', month: 'numeric' })}</text>
                  {/if}
                </g>
              {/each}
            </svg>
          </div>
          <div class="a-kpis">
            <div class="a-kpi"><span class="a-kpi-label">Parties en 30 j</span><span class="a-kpi-value">{month.players}</span><span class="a-kpi-sub">{dec(month.perDay)} par jour</span></div>
            <div class="a-kpi"><span class="a-kpi-label">Ont trouvé</span><span class="a-kpi-value">{dec(month.winRate)} %</span></div>
            <div class="a-kpi"><span class="a-kpi-label">Essais pour trouver</span><span class="a-kpi-value">{dec(month.avgAttempts)}</span><span class="a-kpi-sub">sur 6 possibles</span></div>
          </div>
        </section>
      </div>

      <div>
        <section class="a-section">
          <div class="a-section-head">
            <h2>À venir</h2>
            <span class="a-muted small">{scheduled}/{upcoming.length} programmés</span>
          </div>
          <ul class="a-list">
            {#each upcoming as d (d.date)}
              <li>
                <button class="a-row" type="button" onclick={() => openDay(d)}>
                  <span class="date">{day(d.date)}</span>
                  <span class="a-row-main">
                    {#if d.track}
                      <span class="a-row-title">{d.track.title}</span>
                      <span class="a-row-sub">{d.track.artist}</span>
                    {:else}
                      <span class="a-row-sub">Tirage au hasard</span>
                    {/if}
                  </span>
                  {#if d.track}<em class="a-tag good">Programmé</em>{/if}
                </button>
              </li>
            {/each}
          </ul>
        </section>

        <a class="a-card pool" href="/admin/zikle/pool">
          <span class="a-row-main">
            <span class="a-kpi-label">Pool de titres</span>
            <span class="a-big">{data.poolCount}</span>
            <span class="a-row-sub">{data.poolLastAdded ? `dernier ajout ${ago(data.poolLastAdded)}` : 'vide'}</span>
          </span>
          <span class="a-btn small">Gérer</span>
        </a>
      </div>
    </div>

    <h2 class="a-h2">Jours passés</h2>
    <ul class="a-list">
      {#each history as d (d.date)}
        <li>
          <a class="a-row past" href="/admin/zikle/{d.date}">
            <span class="date">{day(d.date)}</span>
            {#if d.track?.cover_url}<img class="a-cover" src={d.track.cover_url} alt="" />{/if}
            <span class="a-row-main">
              <span class="a-row-title">{d.track?.title ?? 'Pas de titre'}</span>
              <span class="a-row-sub">{d.track?.artist ?? ''}</span>
            </span>
            <span class="nums">
              <span><b>{d.players}</b> joueurs</span>
              <span><b>{pct(d.wins, d.players)} %</b> trouvé</span>
              <span class="opt"><b>{dec(d.avgAttempts)}</b> essais</span>
            </span>
          </a>
        </li>
      {:else}
        <li class="a-empty">Rien sur les 30 derniers jours.</li>
      {/each}
    </ul>
  </div>
</div>

<Sheet bind:open={dayOpen} title={sel ? (sel.date === data.today ? "Titre d'aujourd'hui" : `Titre du ${day(sel.date)}`) : ''}>
  {#if sel}
    {#if sel.track}
      <p class="cur">Actuellement : <b>{sel.track.title}</b> · {sel.track.artist}</p>
    {:else}
      <p class="cur a-muted">Aucun titre programmé : il sera tiré au hasard.</p>
    {/if}
    <div class="a-btns sheet-btns">
      <form method="POST" action="?/rerollRandom" use:enhance={submit}>
        <input type="hidden" name="date" value={sel.date} />
        <button class="a-btn" type="submit" disabled={busy}>Tirer un titre au hasard</button>
      </form>
      {#if sel.track && sel.date > data.today}
        {#if confirmFree}
          <form method="POST" action="?/unschedule" use:enhance={submit}>
            <input type="hidden" name="date" value={sel.date} />
            <button class="a-btn danger" type="submit" disabled={busy}>Confirmer</button>
          </form>
        {:else}
          <button class="a-btn" type="button" onclick={() => (confirmFree = true)}>Retirer ce titre</button>
        {/if}
      {/if}
    </div>
    <p class="a-label pick">Ou choisis un titre précis</p>
    <form method="POST" action="?/setTrack" use:enhance={submit}>
      <input type="hidden" name="date" value={sel.date} />
      <ZikleTrackSearch disabled={busy} />
    </form>
  {/if}
</Sheet>

<Sheet bind:open={wipeOpen} title="Effacer les résultats">
  <p>Supprimer les <b>{todayRow?.players ?? 0}</b> résultats d'aujourd'hui ? Les joueurs pourront rejouer, et leurs séries peuvent en pâtir.</p>
  <form method="POST" action="?/deleteDayResults" class="a-btns sheet-btns" use:enhance={submit}>
    <input type="hidden" name="date" value={data.today} />
    <button class="a-btn danger" type="submit" disabled={busy}>Oui, tout effacer</button>
  </form>
</Sheet>

<style>
  .small { font-size: 0.82rem; }
  .song { display: flex; align-items: center; gap: 14px; }
  .big-cover { width: 84px; height: 84px; border-radius: 12px; object-fit: cover; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4); }
  .song-txt { display: grid; gap: 4px; min-width: 0; }
  .song-txt b { font-family: var(--a-display); font-size: 1.6rem; line-height: 1.05; overflow-wrap: anywhere; }
  .song-txt span { color: var(--a-muted); }
  .today { background: linear-gradient(160deg, var(--a-accent-soft), var(--a-surface) 55%); }
  .facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .facts div { display: grid; gap: 2px; }
  .facts b { font-family: var(--a-display); font-size: 1.5rem; }
  .facts span { font-size: 0.75rem; color: var(--a-dim); }

  .legend { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--a-muted); }
  .lg { display: inline-block; width: 10px; height: 10px; border-radius: 3px; }
  .lg.won { background: var(--a-good); }
  .lg.lost { background: var(--a-accent); opacity: 0.45; margin-left: 6px; }
  .readout { min-height: 1.2em; font-size: 0.85rem; color: var(--a-muted); }
  .readout b { color: var(--a-fg); }
  .chart { min-width: 0; }
  svg { display: block; width: 100%; height: auto; }
  .axis { stroke: var(--a-line); }
  rect.won { fill: var(--a-good); opacity: 0.75; }
  rect.lost { fill: var(--a-accent); opacity: 0.35; }
  g.on rect.won { opacity: 1; }
  g.on rect.lost { opacity: 0.6; }
  rect.hit { fill: transparent; }
  text { fill: var(--a-dim); font-size: 10px; font-family: inherit; }

  .date { flex: 0 0 auto; min-width: 82px; font-size: 0.82rem; font-weight: 700; color: var(--a-muted); text-transform: capitalize; }
  .pool { display: flex; align-items: center; gap: 12px; }
  .pool:hover { border-color: var(--a-dim); }
  .nums { display: grid; justify-items: end; gap: 2px; font-size: 0.78rem; color: var(--a-dim); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .nums b { color: var(--a-fg); }
  .nums .opt { display: none; }
  @media (min-width: 700px) {
    .nums { grid-template-columns: 90px 90px 80px; align-items: center; }
    .nums .opt { display: inline; }
    .nums b { font-size: 0.95rem; }
  }
  @media (max-width: 420px) {
    .past .a-cover { display: none; }
    .date { min-width: 64px; }
  }
  .cur { margin-bottom: 12px; }
  .sheet-btns { margin-top: 12px; }
  .sheet-btns form { display: contents; }
  .pick { margin: 18px 0 8px; }
</style>
