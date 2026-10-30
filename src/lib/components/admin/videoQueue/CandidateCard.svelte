<script>
  let { video, n, reported, previewing, onpick, onpreview } = $props();

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
</script>

<div class="card" class:on={previewing}>
  <button class="pick" type="button" onclick={onpick} title="Choisir cette vidéo">
    <span class="thumb">
      <img src={video.thumbnail} alt="" loading="lazy" />
      <span class="n">{n}</span>
      {#if video.duration}<span class="dur">{fmt(video.duration)}</span>{/if}
    </span>
    <span class="title">{video.title}</span>
    <span class="sub">
      {video.channel}
      {#if video.topic}<em class="a-tag good">officielle</em>{/if}
      {#if video.auto}<em class="a-tag accent">choix auto</em>{/if}
      {#if reported}<em class="a-tag bad">signalée</em>{/if}
    </span>
  </button>
  <button class="play" type="button" onclick={onpreview} aria-label={previewing ? "Arrêter l'aperçu" : 'Écouter un aperçu'}>
    {previewing ? '■' : '▶'}
  </button>
</div>

<style>
  .card { position: relative; height: 100%; }
  .pick {
    display: grid;
    align-content: start;
    gap: 4px;
    width: 100%;
    height: 100%;
    padding: 6px;
    border: 1px solid var(--a-line);
    border-radius: 10px;
    background: var(--a-bg);
    color: var(--a-fg);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .pick:hover { border-color: var(--a-accent); }
  .card.on .pick { border-color: var(--a-accent); background: var(--a-accent-soft); }
  .thumb { position: relative; display: block; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 6px; background: #000; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; }
  .n, .dur { position: absolute; padding: 1px 6px; border-radius: 4px; background: rgba(0, 0, 0, 0.75); color: #fff; font-size: 0.75rem; font-weight: 700; }
  .n { top: 4px; left: 4px; }
  .dur { right: 4px; bottom: 4px; }
  .title { display: -webkit-box; overflow: hidden; font-size: 0.82rem; font-weight: 600; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
  .sub { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 0.72rem; color: var(--a-dim); }
  .play {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    font-size: 0.85rem;
    cursor: pointer;
  }
</style>
