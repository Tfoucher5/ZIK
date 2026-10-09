<script>
  import { untrack } from 'svelte';
  import { FREE_MAX_PLAYERS } from '$lib/proPlans.js';
  import SalonChatPanel from './SalonChatPanel.svelte';
  import SalonTools from './SalonTools.svelte';
  import SalonRoster from './SalonRoster.svelte';
  import SalonSettingsForm from './SalonSettingsForm.svelte';
  import { phaseLabel } from './phase.js';

  /**
   * Fiche d'un salon en cours : chat à droite et outils à gauche sur PC,
   * en onglets sur mobile.
   */
  let { s, token, feedback, busy, submit, fixer = $bindable(false) } = $props();

  let tab = $state(untrack(() => (!fixer && s.support?.open ? 'chat' : 'outils')));
  let lastHost = $state(0);
  let seenHost = $state(untrack(() => s.support?.messages.findLast((m) => m.from === 'host')?.id ?? 0));

  $effect(() => {
    if (tab === 'chat') seenHost = lastHost;
  });

  const TABS = [
    ['chat', 'Chat'],
    ['outils', 'Dépanner'],
    ['joueurs', 'Joueurs'],
    ['reglages', 'Réglages'],
  ];
</script>

<div class="fiche">
  {#if feedback?.error}<p class="a-card bad a-err" role="alert">{feedback.error}</p>{/if}
  {#if feedback?.message}<p class="a-card good a-ok" role="status">{feedback.message}</p>{/if}

  <div class="facts4">
    <div class="a-card fact" class:warn={s.paused}>
      <span class="lbl">Étape</span>
      <b>{phaseLabel(s)}</b>
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

  <div class="a-chips tabs">
    {#each TABS as [id, label] (id)}
      <button type="button" class="a-chip" aria-pressed={tab === id} onclick={() => (tab = id)}>
        {label}
        {#if id === 'chat' && lastHost > seenHost}<i class="dot" aria-label="Nouveau message"></i>{/if}
      </button>
    {/each}
  </div>

  <div class="cols">
    <div class="tools">
      <div class="pane" class:on={tab === 'outils'}>
        <SalonTools {s} {token} {busy} {submit} bind:fixer />
      </div>
      <div class="pane" class:on={tab === 'joueurs'}>
        <SalonRoster {s} {busy} {submit} />
      </div>
      <div class="pane" class:on={tab === 'reglages'}>
        <section class="a-card block">
          <h3>Réglages</h3>
          <SalonSettingsForm {s} {busy} {submit} />
          <p class="a-muted music">Musique : {s.playlists.join(', ') || '?'} · {s.trackCount} titres</p>
          {#if s.limitHits}
            <p class="a-muted music">{s.limitHits} joueur{s.limitHits > 1 ? 's' : ''} bloqué{s.limitHits > 1 ? 's' : ''} par la limite gratuite</p>
          {/if}
        </section>
      </div>
    </div>
    <div class="pane chat" class:on={tab === 'chat'}>
      <SalonChatPanel code={s.code} initial={s.support} {busy} {submit} onUnread={(id) => (lastHost = id)} />
    </div>
  </div>
</div>

<style>
  .fiche { display: grid; gap: 12px; min-width: 0; }
  .facts4 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .fact { display: grid; gap: 3px; align-content: start; font-size: 0.85rem; min-width: 0; overflow-wrap: anywhere; }
  .fact b { font-size: 0.98rem; }
  .fact a { color: var(--a-cyan); }
  .fact.warn { border-color: rgba(251, 191, 36, 0.4); background: var(--a-warn-soft); }
  .fact.bad { border-color: rgba(248, 113, 113, 0.4); background: var(--a-bad-soft); }
  .lbl { font-size: 0.8rem; color: var(--a-muted); }
  .tabs .a-chip { position: relative; }
  .dot { position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; border-radius: 50%; background: var(--a-bad); }
  .cols, .tools { display: grid; gap: 12px; min-width: 0; }
  .pane { display: none; min-width: 0; }
  .pane.on { display: grid; gap: 12px; }
  .block { display: grid; gap: 10px; min-width: 0; }
  h3 { font-size: 0.8rem; font-weight: 700; color: var(--a-dim); text-transform: uppercase; letter-spacing: 0.04em; }
  .music { font-size: 0.82rem; overflow-wrap: anywhere; }
  @media (min-width: 900px) {
    .facts4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .tabs { display: none; }
    .cols { grid-template-columns: minmax(0, 1fr) 330px; align-items: start; }
    .pane { display: grid; gap: 12px; }
    .chat { position: sticky; top: 0; order: 2; }
  }
</style>
