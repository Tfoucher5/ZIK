<script>
  import { enhance } from '$app/forms';
  import { ago } from '$lib/shared/admin/stats-utils.js';

  /** En-tête d'une playlist : identité, chiffres et actions rapides. */
  let { playlist, trackCount, plays, counts, keep, onEdit, onDelete } = $props();
</script>

<section class="hero a-section">
  <span class="big-tile" class:official={playlist.is_official}>{playlist.emoji}</span>
  <div class="hero-main">
    <h2>{playlist.name}</h2>
    <p class="by">
      par {#if playlist.owner_id}<a href="/admin/users/{playlist.owner_id}">{playlist.profiles?.username ?? 'inconnu'}</a>{:else}inconnu{/if}
      · créée {ago(playlist.created_at)} · modifiée {ago(playlist.updated_at)}
    </p>
    <div class="tags">
      {#if playlist.is_official}<em class="a-tag warn">★ Officielle</em>{/if}
      <em class="a-tag {playlist.is_public ? 'good' : ''}">{playlist.is_public ? 'Publique' : 'Privée'}</em>
      {#if playlist.linked_room_id}<em class="a-tag accent">Room {playlist.linked_room_id}</em>{/if}
    </div>
  </div>
  <div class="hero-stats">
    <div><span class="a-big">{trackCount}</span><small>titres</small></div>
    {#if plays !== null}<div><span class="a-big">{plays.toLocaleString('fr-FR')}</span><small>parties</small></div>{/if}
    {#if counts.nopreview}<div><span class="a-big warn">{counts.nopreview}</span><small>sans extrait</small></div>{/if}
    {#if counts.reported}<div><span class="a-big bad">{counts.reported}</span><small>signalés</small></div>{/if}
  </div>
  <div class="a-btns hero-actions">
    <form method="POST" action="/admin/playlists?/toggleFlag" use:enhance={keep}>
      <input type="hidden" name="id" value={playlist.id} />
      <input type="hidden" name="field" value="is_official" />
      <input type="hidden" name="value" value={String(!playlist.is_official)} />
      <button class="a-btn small">{playlist.is_official ? 'Retirer des officielles' : '★ Rendre officielle'}</button>
    </form>
    <form method="POST" action="/admin/playlists?/toggleFlag" use:enhance={keep}>
      <input type="hidden" name="id" value={playlist.id} />
      <input type="hidden" name="field" value="is_public" />
      <input type="hidden" name="value" value={String(!playlist.is_public)} />
      <button class="a-btn small">{playlist.is_public ? 'Rendre privée' : 'Rendre publique'}</button>
    </form>
    <button class="a-btn small" type="button" onclick={onEdit}>Modifier</button>
    <button class="a-btn small danger" type="button" onclick={onDelete}>Supprimer</button>
  </div>
</section>

<style>
  .hero { grid-template-columns: auto 1fr; align-items: center; gap: 14px; }
  .big-tile {
    display: grid;
    place-items: center;
    width: 72px;
    height: 72px;
    border-radius: 16px;
    background: linear-gradient(135deg, var(--a-surface2), var(--a-accent-soft));
    font-size: 2.4rem;
  }
  .big-tile.official { box-shadow: inset 0 0 0 2px var(--a-warn); }
  .hero-main { display: grid; gap: 6px; min-width: 0; }
  .hero-main h2 {
    font-family: var(--a-display);
    font-size: 1.7rem;
    font-weight: 800;
    line-height: 1.05;
    overflow-wrap: anywhere;
  }
  .by { font-size: 0.82rem; color: var(--a-dim); }
  .by a { color: var(--a-cyan); }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .hero-stats { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 22px; }
  .hero-stats div { display: grid; gap: 2px; }
  .hero-stats small { font-size: 0.75rem; color: var(--a-dim); }
  .a-big.warn { color: var(--a-warn); }
  .a-big.bad { color: var(--a-bad); }
  .hero-actions { grid-column: 1 / -1; }
  .hero-actions form { display: contents; }
  @media (min-width: 900px) {
    .hero { grid-template-columns: auto 1fr auto; padding: 22px; }
    .big-tile { width: 96px; height: 96px; font-size: 3.2rem; }
    .hero-main h2 { font-size: 2.2rem; }
    .hero-stats { grid-column: auto; }
  }
</style>
