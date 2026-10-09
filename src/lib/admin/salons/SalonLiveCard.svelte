<script>
  import { FREE_MAX_PLAYERS } from '$lib/proPlans.js';
  import { phaseLabel } from './phase.js';
  import { since } from './since.js';

  /** Un salon en cours dans la liste, mis en avant s'il appelle un admin. */
  let { s, selected = false, onOpen } = $props();

  const call = $derived(s.support?.open && s.support.requestedAt ? s.support : null);
  const lastHost = $derived(call?.messages.findLast((m) => m.from === 'host') ?? null);
</script>

<article class="a-card salon" class:open={selected} class:call>
  <header>
    <span class="dot" class:off={!s.hostConnected} title={s.hostConnected ? 'Hôte connecté' : 'Hôte déconnecté'}></span>
    <b class="code">{s.code}</b>
    {#if s.pro}<em class="a-tag accent">Pro</em>{/if}
    <span class="host">
      {#if s.hostId}<a href="/admin/users/{s.hostId}">{s.host ?? 'hôte'}</a>{:else}<span class="a-muted">hôte sans compte</span>{/if}
    </span>
  </header>
  {#if call}
    <p class="ask">
      <em class="a-tag bad">Appelle un admin</em>
      <span>{since(call.requestedAt)}{call.adminJoined ? ' · admin connecté' : ''}</span>
    </p>
    {#if lastHost}<p class="quote">« {lastHost.text} »</p>{/if}
  {/if}
  <p class="state">
    <span class:full={!s.pro && s.players >= FREE_MAX_PLAYERS}>{s.players}{s.pro ? '' : `/${FREE_MAX_PLAYERS}`} joueurs</span>
    · {phaseLabel(s)}
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
    <button class="a-btn small primary" type="button" onclick={() => onOpen(false)}>{call ? 'Répondre et dépanner' : 'Ouvrir et dépanner'}</button>
    {#if s.track?.id}
      <button class="a-btn small" type="button" onclick={() => onOpen(true)}>Corriger la vidéo</button>
    {/if}
  </div>
</article>

<style>
  .salon { display: grid; gap: 8px; }
  .salon header { display: flex; align-items: center; gap: 8px; }
  .salon.open { border-color: var(--a-accent); }
  .salon.call { border-color: rgba(248, 113, 113, 0.6); background: var(--a-bad-soft); }
  .salon .a-btns { margin-top: 2px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--a-good); }
  .dot.off { background: var(--a-warn); }
  .code { font-family: var(--a-display); font-size: 1.3rem; letter-spacing: 0.06em; }
  .host { margin-left: auto; font-size: 0.88rem; }
  .host a { color: var(--a-cyan); }
  .ask { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 0.88rem; font-weight: 600; }
  .quote { font-size: 0.9rem; overflow-wrap: anywhere; }
  .state { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.88rem; color: var(--a-muted); }
  .full { color: var(--a-bad); font-weight: 700; }
  .tv { display: grid; gap: 6px; padding: 10px; border-radius: 10px; background: var(--a-bg); font-size: 0.88rem; }
</style>
