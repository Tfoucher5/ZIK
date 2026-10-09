<script>
  import { getContext, untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import VideoFixer from '$lib/admin/VideoFixer.svelte';
  import { ago } from '$lib/admin/stats-utils.js';
  import { FREE_MAX_PLAYERS } from '$lib/proPlans.js';

  let { data, form } = $props();

  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  const wanted = untrack(() => page.url.searchParams.get('code')?.toUpperCase() ?? null);
  let ficheCode = $state(wanted);
  let ficheOpen = $state(!!wanted);
  let fixer = $state(false);
  let busy = $state(false);
  let arm = $state(null);
  let msgText = $state('Le support ZIK est là : ');
  let msgTarget = $state('both');

  const fiche = $derived(data.live.find((s) => s.code === ficheCode) ?? null);

  // Les salons en cours bougent vite : rechargement toutes les 15 s, 5 s sur une fiche ouverte
  $effect(() => {
    const ms = ficheOpen ? 5_000 : 15_000;
    const id = setInterval(() => { if (!busy) invalidateAll(); }, ms);
    return () => clearInterval(id);
  });

  $effect(() => {
    if (ficheOpen) return;
    untrack(() => {
      fixer = false;
      arm = null;
      if (page.url.searchParams.has('code')) {
        const url = new URL(page.url);
        url.searchParams.delete('code');
        replaceState(url, {});
      }
    });
  });

  function phase(s) {
    if (s.phase === 'lobby') return 'En attente des joueurs';
    if (s.phase === 'starting') return 'Lancement de la partie';
    if (s.phase === 'gameover') return 'Partie finie';
    return `Manche ${s.round}/${s.maxRounds}${s.phase === 'summary' ? ' · réponse affichée' : ''}${s.paused ? ' · en pause' : ''}`;
  }

  function open(s, withFixer = false) {
    ficheCode = s.code;
    fixer = withFixer;
    arm = null;
    ficheOpen = true;
    const url = new URL(page.url);
    url.searchParams.set('code', s.code);
    replaceState(url, {});
  }

  const submit = ({ action }) => {
    busy = true;
    return async ({ result, update }) => {
      busy = false;
      arm = null;
      await update({ reset: false });
      if (result.type === 'success' && action.search === '?/message') msgText = 'Le support ZIK est là : ';
    };
  };

  const feedback = $derived(form?.code && form.code === ficheCode ? form : null);
</script>

{#snippet confirm(id, label, danger = false)}
  {#if arm === id}
    <button type="button" class="a-btn small" onclick={() => (arm = null)}>Annuler</button>
    <button class="a-btn small {danger ? 'danger' : 'primary'}" disabled={busy}>Confirmer</button>
  {:else}
    <button type="button" class="a-btn small {danger ? 'danger' : ''}" onclick={() => (arm = id)}>{label}</button>
  {/if}
{/snippet}

{#snippet panel(s)}
  <div class="fiche">
    {#if feedback?.error}<p class="a-card bad a-err" role="alert">{feedback.error}</p>{/if}
    {#if feedback?.message}<p class="a-card good a-ok" role="status">{feedback.message}</p>{/if}

    <div class="facts4">
      <div class="a-card fact" class:warn={s.paused}>
        <span class="lbl">Étape</span>
        <b>{phase(s)}</b>
        {#if s.timer != null}<span class="a-muted">{s.timer} s restantes</span>{/if}
      </div>
      <div class="a-card fact" class:bad={!s.hostConnected}>
        <span class="lbl">Hôte</span>
        <b>{s.hostConnected ? 'Connecté' : 'Déconnecté'}</b>
        <span class="a-muted">{s.screens} écran TV · {s.controls} régie</span>
      </div>
      <div class="a-card fact">
        <span class="lbl">Joueurs</span>
        <b>{s.roster.filter((p) => !p.offline).length} en ligne</b>
        <span class="a-muted">{s.players} au total{s.pro ? '' : ` · max ${FREE_MAX_PLAYERS}`}</span>
      </div>
      <div class="a-card fact">
        <span class="lbl">Offre</span>
        <b>{s.pro ? (s.proGift ? 'Pro offert' : 'Pro') : 'Gratuit'}</b>
        <span class="a-muted">
          {#if s.hostId}<a href="/admin/users/{s.hostId}">{s.host ?? 'compte hôte'}</a>{:else}hôte sans compte{/if}
        </span>
      </div>
    </div>

    {#if s.track}
      <section class="a-card block">
        <h3>Titre en cours</h3>
        <p class="now"><b>{s.track.artist}</b> · {s.track.title}</p>
        {#if s.track.id}
          <button class="a-btn small" type="button" onclick={() => (fixer = !fixer)}>{fixer ? 'Masquer la vidéo' : 'Voir et corriger la vidéo'}</button>
          {#if fixer}
            {#key s.code + s.track.id}
              <VideoFixer track={s.track} reported={s.video ? { videoId: s.video.id, start: s.video.start } : null} {token} />
            {/key}
          {/if}
        {/if}
      </section>
    {/if}

    <section class="a-card block">
      <h3>Dépanner</h3>
      <div class="a-btns">
        {#if s.paused}
          <form method="POST" action="?/resume" use:enhance={submit}>
            <input type="hidden" name="code" value={s.code} />
            <button class="a-btn good" disabled={busy}>Reprendre</button>
          </form>
        {:else if s.phase === 'round' || s.phase === 'summary'}
          <form method="POST" action="?/pause" use:enhance={submit}>
            <input type="hidden" name="code" value={s.code} />
            <button class="a-btn" disabled={busy}>Mettre en pause</button>
          </form>
        {/if}
        {#if s.phase === 'round' || s.phase === 'summary'}
          <form method="POST" action="?/skip" use:enhance={submit} class="inline">
            <input type="hidden" name="code" value={s.code} />
            {@render confirm('skip', s.phase === 'round' ? 'Passer le titre' : 'Manche suivante')}
          </form>
        {/if}
        {#if !s.pro}
          <form method="POST" action="?/giftPro" use:enhance={submit} class="inline">
            <input type="hidden" name="code" value={s.code} />
            {@render confirm('pro', 'Offrir le Pro ce soir')}
          </form>
        {/if}
      </div>
      <p class="a-muted hint">
        {#if s.phase === 'round'}« Passer le titre » révèle la réponse, puis la partie continue.{:else if s.phase === 'summary'}« Manche suivante » lance le titre d'après.{:else}Pause et passage de titre servent pendant une partie.{/if}
        {#if !s.pro} Le Pro offert débloque tout le salon jusqu'à sa fermeture, sans paiement.{/if}
      </p>
    </section>

    <section class="a-card block">
      <h3>Écrire à l'hôte</h3>
      <form class="a-form" method="POST" action="?/message" use:enhance={submit}>
        <input type="hidden" name="code" value={s.code} />
        <textarea class="a-textarea" name="message" rows="2" maxlength="280" bind:value={msgText}></textarea>
        <div class="a-form-row">
          <select class="a-select" name="target" bind:value={msgTarget} aria-label="Où afficher le message">
            <option value="both">Écran TV et régie</option>
            <option value="control">Régie seulement</option>
            <option value="screen">Écran TV seulement</option>
          </select>
          <button class="a-btn primary" disabled={busy || !msgText.trim()}>Afficher</button>
        </div>
      </form>
      {#if s.support}<p class="a-muted hint">Dernier message {ago(new Date(s.support.at).toISOString())} : « {s.support.message} »</p>{/if}
    </section>

    <section class="a-card block">
      <h3>Joueurs ({s.players})</h3>
      <ul class="a-list">
        {#each s.roster as p (p.username)}
          <li class="a-row">
            <span class="a-row-main">
              <span class="a-row-title">{p.username}</span>
              <span class="a-row-sub">{p.score} pts{p.team != null && s.settings.teams[p.team] ? ` · ${s.settings.teams[p.team]}` : ''}</span>
            </span>
            {#if p.offline}<em class="a-tag warn">Parti</em>{/if}
            <form method="POST" action="?/kick" use:enhance={submit} class="inline">
              <input type="hidden" name="code" value={s.code} />
              <input type="hidden" name="username" value={p.username} />
              {@render confirm(`kick:${p.username}`, 'Retirer', true)}
            </form>
          </li>
        {:else}
          <li class="a-empty">Personne pour l'instant.</li>
        {/each}
      </ul>
    </section>

    <section class="a-card block">
      <h3>Réglages</h3>
      <dl class="facts">
        <div><dt>Réponses</dt><dd>{s.settings.answerMode === 'multiple' ? 'QCM (4 choix)' : 'Réponse libre'}</dd></div>
        <div><dt>Manches</dt><dd>{s.maxRounds} de {s.settings.roundDuration} s, réponse affichée {s.settings.showAnswerDuration} s</dd></div>
        <div><dt>Suite</dt><dd>{s.settings.manualNext ? "À la main par l'hôte" : 'Automatique'}</dd></div>
        <div><dt>Équipes</dt><dd>{s.settings.teams.length ? s.settings.teams.join(', ') : 'Sans équipes'}</dd></div>
        <div><dt>Musique</dt><dd>{s.playlists.join(', ') || '?'} · {s.trackCount} titres</dd></div>
        {#if s.limitHits}<div><dt>Refusés</dt><dd>{s.limitHits} joueur{s.limitHits > 1 ? 's' : ''} bloqué{s.limitHits > 1 ? 's' : ''} par la limite gratuite</dd></div>{/if}
      </dl>
    </section>
  </div>
{/snippet}

<div class="adm-page">
  <PageHeader title="Salons" />

  <div class="a-stack">
    <h2 class="a-h2">En direct</h2>
    <div class="live-grid">
    {#each data.live as s (s.code)}
      <article class="a-card salon" class:open={ficheOpen && ficheCode === s.code}>
        <header>
          <span class="dot" class:off={!s.hostConnected} title={s.hostConnected ? 'Hôte connecté' : 'Hôte déconnecté'}></span>
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
          {#if !s.hostConnected}<em class="a-tag warn">Hôte déconnecté</em>{/if}
        </p>
        {#if s.track}
          <div class="tv">
            <span class="a-muted">Sur la TV</span>
            <b>{s.track.artist} · {s.track.title}</b>
          </div>
        {/if}
        <div class="a-btns">
          <button class="a-btn small primary" type="button" onclick={() => open(s)}>Ouvrir et dépanner</button>
          {#if s.track?.id}
            <button class="a-btn small" type="button" onclick={() => open(s, true)}>Corriger la vidéo</button>
          {/if}
        </div>
      </article>
    {:else}
      <p class="a-card a-empty">Aucun salon en cours.</p>
    {/each}
    </div>
    {#if wanted && !data.live.some((s) => s.code === wanted)}
      <p class="a-card warn">Le salon {wanted} n'est plus en cours.</p>
    {/if}

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

<Sheet bind:open={ficheOpen} title="Salon {ficheCode ?? ''}" wide>
  {#if fiche}
    {@render panel(fiche)}
  {:else}
    <p class="a-empty">Ce salon est terminé ou fermé.</p>
  {/if}
</Sheet>

<style>
  .live-grid { display: grid; gap: 12px; }
  @media (min-width: 900px) { .live-grid { grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); } }
  .salon { display: grid; gap: 8px; }
  .salon header { display: flex; align-items: center; gap: 8px; }
  .salon.open { border-color: var(--a-accent); }
  .salon .a-btns { margin-top: 2px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--a-good); }
  .dot.off { background: var(--a-warn); }
  .code { font-family: var(--a-display); font-size: 1.3rem; letter-spacing: 0.06em; }
  .host { margin-left: auto; font-size: 0.88rem; }
  .host a { color: var(--a-cyan); }
  .state { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.88rem; color: var(--a-muted); }
  .full { color: var(--a-bad); font-weight: 700; }
  .tv { display: grid; gap: 6px; padding: 10px; border-radius: 10px; background: var(--a-bg); font-size: 0.88rem; }
  .issues { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .stat { display: grid; gap: 6px; }
  .stat.bad { border-color: rgba(248, 113, 113, 0.4); background: var(--a-bad-soft); }
  .lbl { font-size: 0.8rem; color: var(--a-muted); }
  .hint { margin-top: -6px; font-size: 0.82rem; }
  .fiche { display: grid; gap: 12px; min-width: 0; }
  .facts4 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  @media (min-width: 900px) { .facts4 { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  .fact { display: grid; gap: 3px; align-content: start; font-size: 0.85rem; min-width: 0; overflow-wrap: anywhere; }
  .fact b { font-size: 0.98rem; }
  .fact a { color: var(--a-cyan); }
  .fact.warn { border-color: rgba(251, 191, 36, 0.4); background: var(--a-warn-soft); }
  .fact.bad { border-color: rgba(248, 113, 113, 0.4); background: var(--a-bad-soft); }
  .block { display: grid; gap: 10px; min-width: 0; }
  .block h3 { font-size: 0.8rem; font-weight: 700; color: var(--a-dim); text-transform: uppercase; letter-spacing: 0.04em; }
  .block .a-btn.small { justify-self: start; }
  .now { overflow-wrap: anywhere; }
  .inline { display: contents; }
  .block .a-row { flex-wrap: wrap; }
  .facts { display: grid; gap: 8px; }
  .facts > div { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 10px; font-size: 0.88rem; }
  dt { font-size: 0.75rem; font-weight: 700; color: var(--a-dim); text-transform: uppercase; letter-spacing: 0.04em; }
  dd { min-width: 0; overflow-wrap: anywhere; }
</style>
