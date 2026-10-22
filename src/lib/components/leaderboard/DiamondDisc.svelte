<script>
  /** Disque de diamant du N°1, avec son avatar (ou son initiale) en étiquette. */
  let { avatarUrl, username } = $props();
</script>

<div class="vinyl" aria-hidden="true">
  <div class="disc">
    <div class="disc-label">
      {#if avatarUrl}
        <img src={avatarUrl} alt="" loading="lazy" referrerpolicy="no-referrer" />
      {:else}
        <span>{username[0].toUpperCase()}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .vinyl {
    position: relative;
    height: 100%;
    min-height: 240px;
  }
  .disc {
    position: absolute;
    left: -170px;
    top: 50%;
    transform: translateY(-50%);
    width: 400px;
    height: 400px;
    border-radius: 50%;
    background: repeating-radial-gradient(circle at 50% 50%, #a8d8ec 0 1.5px, #4a7b93 1.5px 3.8px);
    box-shadow:
      0 0 0 1px rgba(168, 216, 236, 0.4),
      30px 0 80px rgba(0, 0, 0, 0.7),
      0 0 60px rgba(125, 200, 235, 0.18);
    animation: disc-spin 14s linear infinite;
  }
  @keyframes disc-spin {
    to {
      transform: translateY(-50%) rotate(360deg);
    }
  }
  .disc::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      transparent 0 12%,
      rgb(var(--c-glass) / 0.09) 16%,
      transparent 21%,
      transparent 55%,
      rgb(var(--c-glass) / 0.05) 60%,
      transparent 66%
    );
  }
  .disc-label {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 34%;
    height: 34%;
    border-radius: 50%;
    z-index: 1;
    overflow: hidden;
    background: radial-gradient(circle, #fff, var(--accent) 75%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 2.2rem;
    color: var(--on-accent);
  }
  .disc-label img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 960px) {
    .vinyl {
      min-height: 190px;
      grid-row: 1 / span 2;
    }
    .disc {
      width: 280px;
      height: 280px;
      left: -150px;
    }
  }
  @media (max-width: 640px) {
    .vinyl {
      min-height: 150px;
    }
    .disc {
      width: 190px;
      height: 190px;
      left: -110px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .disc {
      animation: none;
    }
  }
  :global(.no-animations) .disc {
    animation: none;
  }
</style>
