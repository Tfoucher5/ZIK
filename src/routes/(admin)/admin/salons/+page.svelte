<script>
  import { getContext } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import VideoFixer from '$lib/admin/VideoFixer.svelte';
  import { ago } from '$lib/admin/stats-utils.js';
  import { FREE_MAX_PLAYERS } from '$lib/proPlans.js';

  let { data } = $props();

  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let fixing = $state(null);
  let sheetOpen = $state(false);

  // Les salons en cours bougent vite : on recharge toutes les 15 s
  $effect(() => {
    const id = setInterval(() => { if (!sheetOpen) invalidateAll(); }, 15_000);
    return () => clearInterval(id);
  });

  function phase(s) {
    if (s.phase === 'lobby') return 'En attente des joueurs';
    if (s.phase === 'gameover') return 'Partie finie';
    return `Manche ${s.round}/${s.maxRounds}${s.phase === 'summary' ? ' · réponse affichée' : ''}`;
  }

  function fix(s) {
    fixing = s;
    sheetOpen = true;
  }
</script>

<div class="adm-page">
  <PageHeader title="Salons" />

  <div class="a-stack">
    <h2 class="a-h2">En direct</h2>
    <div class="live-grid">
    {#each data.live as s (s.code)}
      <article class="a-card salon">
        <header>
          <span class="dot"></span>
          <b class="code">{s.code}</b>
          {#if s.pro}<em class="a-tag accent">Pro</em>{/if}
          <span class="host">
            {#if s.hostId}<a href="/admin/users/{s.hostId}">{s.host ?? 'hôte'}</a>{:else}<span class="a-muted">hôte sans compte</span>{/if}
          </span>
        </header>
        <p class="state">
          <span class:full={!s.pro && s.players >= FREE_MAX_PLAYERS}>{s.players}{s.pro ? '' : `/${FREE_MAX_PLAYERS}`} joueurs</span>
          · {phase(s)}
          {#if s.limitHits}<em class="a-tag bad">{s.limitHits} refusé{s.limitHits > 1 ? 's' : ''}</em>{/if}
        </p>
        {#if s.track}
          <div class="tv">
            <span class="a-muted">Sur la TV</span>
            <b>{s.track.artist} · {s.track.title}</b>
            {#if s.track.id}
              <button class="a-btn small" type="button" onclick={() => fix(s)}>Voir et corriger la vidéo</button>
            {/if}
          </div>
        {/if}
      </article>
    {:else}
      <p class="a-card a-empty">Aucun salon en cours.</p>
    {/each}
    </div>

    {#if data.videoIssues}
      <a class="a-card warn issues" href="/admin/reparer">
        <b>{data.videoIssues} vidéo{data.videoIssues > 1 ? 's' : ''} de salon à réparer</b>
        <span class="a-btn small">Réparer</span>
      </a>
    {/if}

    <div class="a-cols">
    <div>
    <h2 class="a-h2">Hôtes</h2>
    <p class="a-muted hint">Les hôtes gratuits qui butent sur la limite sont les meilleurs candidats au Pro.</p>
    <ul class="a-list">
      {#each data.hosts as h (h.id)}
        <li>
          <a class="a-row" href="/admin/users/{h.id}">
            <span class="a-row-main">
              <span class="a-row-title">{h.username}</span>
              <span class="a-row-sub">{h.games} partie{h.games > 1 ? 's' : ''} · jusqu'à {h.max} joueurs · {ago(h.last)}</span>
            </span>
            {#if h.pro}
              <em class="a-tag accent">Pro</em>
            {:else if h.limitHits}
              <em class="a-tag bad">{h.limitHits} refusé{h.limitHits > 1 ? 's' : ''}</em>
            {/if}
          </a>
        </li>
      {:else}
        <li class="a-empty">Aucun salon avec un hôte connecté ce mois-ci.</li>
      {/each}
    </ul>
    </div>
    <div>
    <h2 class="a-h2">Ces 30 derniers jours</h2>
    <div class="a-grid2">
      <div class="a-card stat"><span class="a-big">{data.month.games}</span><span class="lbl">parties de salon</span></div>
      <div class="a-card stat"><span class="a-big">{String(data.month.avgPlayers).replace('.', ',')}</span><span class="lbl">joueurs en moyenne</span></div>
      <div class="a-card stat" class:bad={data.month.limitHits}><span class="a-big">{data.month.limitHits}</span><span class="lbl">refusés par la limite de {FREE_MAX_PLAYERS}</span></div>
      <div class="a-card stat"><span class="a-big">{data.month.guests}</span><span class="lbl">parties d'hôtes sans compte</span></div>
    </div>
    </div>
    </div>

  </div>
</div>

<Sheet bind:open={sheetOpen} title="Vidéo du salon {fixing?.code ?? ''}">
  {#if fixing}
    {#key fixing.code + fixing.track.id}
      <p class="who"><b>{fixing.track.artist}</b> · {fixing.track.title}</p>
      <VideoFixer track={fixing.track} reported={fixing.video ? { videoId: fixing.video.id, start: fixing.video.start } : null} {token} />
    {/key}
  {/if}
</Sheet>

<style>
  .live-grid { display: grid; gap: 12px; }
  @media (min-width: 900px) { .live-grid { grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); } }
  .salon { display: grid; gap: 8px; }
  .salon header { display: flex; align-items: center; gap: 8px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--a-good); }
  .code { font-family: var(--a-display); font-size: 1.3rem; letter-spacing: 0.06em; }
  .host { margin-left: auto; font-size: 0.88rem; }
  .host a { color: var(--a-cyan); }
  .state { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.88rem; color: var(--a-muted); }
  .full { color: var(--a-bad); font-weight: 700; }
  .tv { display: grid; gap: 6px; padding: 10px; border-radius: 10px; background: var(--a-bg); font-size: 0.88rem; }
  .tv .a-btn { justify-self: start; }
  .issues { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .stat { display: grid; gap: 6px; }
  .stat.bad { border-color: rgba(248, 113, 113, 0.4); background: var(--a-bad-soft); }
  .lbl { font-size: 0.8rem; color: var(--a-muted); }
  .hint { margin-top: -6px; font-size: 0.82rem; }
  .who { margin-bottom: 12px; }
</style>
