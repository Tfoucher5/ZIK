<script>
  import { enhance } from '$app/forms';

  /** Un titre de la playlist : extrait, noms affichés, réponses en plus et actions. */
  let { t, first, last, playing, canReorder, typeName, keep, onToggle, onEdit, onRepair } = $props();

  let arming = $state(false);

  const artist = $derived(t.custom_artist || t.track?.artist || '?');
  const title = $derived(t.custom_title || t.track?.title || '?');
</script>

<li class="trk" class:on={playing}>
  <span class="pos">{t.position + 1}</span>
  {#if t.track?.preview_url}
    <button class="cover-btn" type="button" aria-label={playing ? 'Pause' : 'Écouter l’extrait'} onclick={onToggle}>
      {#if t.track.cover_url}<img class="a-cover" src={t.track.cover_url} alt="" loading="lazy" />{:else}<span class="a-cover"></span>{/if}
      <span class="play">{playing ? '❚❚' : '▶'}</span>
    </button>
  {:else if t.track?.cover_url}
    <img class="a-cover" src={t.track.cover_url} alt="" loading="lazy" />
  {:else}
    <span class="a-cover"></span>
  {/if}
  <div class="a-row-main">
    <span class="a-row-title">
      {title}{#if t.custom_title}<span class="mark" title="Titre modifié pour cette playlist">✎</span>{/if}
    </span>
    <span class="a-row-sub">
      {artist}{#if t.custom_artist}<span class="mark" title="Artiste modifié pour cette playlist">✎</span>{/if}
      {#if t.custom_feats?.length} · feat. {t.custom_feats.join(', ')}{/if}
    </span>
    {#if t.answers.length || t.reported || !t.track?.preview_url || t.track?.youtube_id}
      <span class="tags">
        {#if t.reported}<em class="a-tag bad">signalé</em>{/if}
        {#if !t.track?.preview_url}<em class="a-tag warn">sans extrait</em>{/if}
        {#if t.track?.youtube_id}<em class="a-tag good">vidéo épinglée</em>{/if}
        {#each t.answers as a (a.id)}<em class="a-tag accent">{typeName[a.answer_type_id]} : {a.value}</em>{/each}
      </span>
    {/if}
  </div>
  <div class="acts">
    {#if canReorder}
      <form method="POST" action="?/reorderTrack" use:enhance={keep}>
        <input type="hidden" name="track_id" value={t.id} />
        <input type="hidden" name="direction" value="up" />
        <button class="a-btn small icon" aria-label="Monter" disabled={first}>▲</button>
      </form>
      <form method="POST" action="?/reorderTrack" use:enhance={keep}>
        <input type="hidden" name="track_id" value={t.id} />
        <input type="hidden" name="direction" value="down" />
        <button class="a-btn small icon" aria-label="Descendre" disabled={last}>▼</button>
      </form>
    {/if}
    <button class="a-btn small" type="button" onclick={onEdit}>Modifier</button>
    <button class="a-btn small" type="button" disabled={!t.track} onclick={onRepair}>Réparer</button>
    <form method="POST" action="?/deleteTrack" use:enhance={keep}>
      <input type="hidden" name="track_id" value={t.id} />
      <button
        class="a-btn small"
        class:danger={arming}
        onclick={(e) => { if (!arming) { e.preventDefault(); arming = true; } }}
        onblur={() => (arming = false)}
      >{arming ? 'Confirmer' : 'Retirer'}</button>
    </form>
  </div>
</li>

<style>
  .trk {
    display: grid;
    grid-template-columns: 22px 44px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--a-line);
    border-radius: 14px;
    background: var(--a-surface);
  }
  .trk.on { border-color: var(--a-accent); }
  .pos { font-size: 0.75rem; text-align: right; color: var(--a-dim); font-variant-numeric: tabular-nums; }
  .cover-btn { position: relative; padding: 0; border: 0; background: none; cursor: pointer; }
  .cover-btn .a-cover { display: block; }
  .play {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    font-size: 0.9rem;
  }
  .trk.on .play { background: rgba(255, 61, 240, 0.55); }
  .mark { margin-left: 4px; font-size: 0.75rem; color: var(--a-warn); }
  .trk .tags { margin-top: 2px; }
  .acts { grid-column: 1 / -1; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
  .acts form { display: contents; }
  .icon { min-width: 32px; padding-inline: 6px; }
  @media (min-width: 900px) {
    .trk { grid-template-columns: 26px 44px minmax(0, 1fr) auto; }
    .acts { grid-column: auto; flex-wrap: nowrap; }
  }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
</style>
