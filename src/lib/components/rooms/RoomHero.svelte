<script>
  /** En-tête de la page d'une room : badges, nom, description et mode de jeu. */
  let { room } = $props();
</script>

<div class="room-hero">
  <div class="room-hero-bg">
    <div class="orb o1"></div>
    <div class="orb o2"></div>
  </div>
  <div class="room-hero-content">
    <div class="room-badges">
      {#if room.is_official}
        <span class="room-badge-official">⭐ Room officielle</span>
      {/if}
      {#if room.game_mode === 'qcm'}
        <span class="room-badge-qcm">🎯 Mode QCM</span>
      {/if}
    </div>
    <div class="room-emoji">{room.emoji}</div>
    <h1 class="room-title">{room.name}</h1>
    {#if room.description}
      <p class="room-desc">{room.description}</p>
    {/if}
    <div class="room-meta">
      <span class="room-meta-chip">🎵 Blind Test</span>
      <span class="room-meta-chip">🌐 Multijoueur</span>
      <span class="room-meta-chip">⚡ Gratuit</span>
      {#if room.game_mode === 'qcm'}
        <span class="room-meta-chip room-meta-chip-qcm">🎯 QCM — Choix multiple</span>
      {:else}
        <span class="room-meta-chip">⌨️ Mode Classique</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .room-hero {
    position: relative;
    overflow: hidden;
    padding: 60px clamp(16px, 5vw, 80px) 48px;
    text-align: center;
  }
  .room-hero-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .room-badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 20px;
  }
  .room-badge-official {
    display: inline-block;
    background: rgba(250, 204, 21, 0.12);
    border: 1px solid rgba(250, 204, 21, 0.3);
    color: #fbbf24;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 50px;
    letter-spacing: 0.3px;
  }
  .room-badge-qcm {
    display: inline-block;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #4ade80;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 50px;
    letter-spacing: 0.3px;
  }
  .room-meta-chip-qcm {
    color: #4ade80;
    background: rgba(34, 197, 94, 0.08);
    border-color: rgba(34, 197, 94, 0.2);
  }
  .room-emoji {
    font-size: 3.5rem;
    line-height: 1;
    margin-bottom: 16px;
  }
  .room-title {
    font-family: "Barlow Condensed", sans-serif;
    font-size: clamp(2rem, 5vw, 3.2rem);
    font-weight: 800;
    letter-spacing: -1px;
    margin-bottom: 12px;
  }
  .room-desc {
    font-size: 1rem;
    color: var(--mid, #94a3b8);
    max-width: 500px;
    margin: 0 auto 20px;
    line-height: 1.6;
  }
  .room-meta {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .room-meta-chip {
    background: rgb(var(--c-glass) / 0.06);
    border: 1px solid rgb(var(--c-glass) / 0.1);
    border-radius: 50px;
    padding: 4px 12px;
    font-size: 0.78rem;
    color: var(--mid, #94a3b8);
  }
</style>
