<script>
  /** Révélation d'une manche jouée sans vidéo (extrait audio) : la pochette prend la place de la vidéo. */
  let { cover = null } = $props();
</script>

<div class="ar">
  {#if cover}<div class="ar-fond" style:background-image={`url("${cover}")`}></div>{/if}
  <div class="ar-centre">
    {#if cover}<img src={cover} alt="" width="360" height="360">{/if}
    <div class="ar-eq" aria-hidden="true">
      {#each [0, 1, 2, 3, 4, 5, 6] as i (i)}<span style="--i:{i}"></span>{/each}
    </div>
  </div>
</div>

<style>
  .ar {
    position: absolute;
    inset: 0;
    z-index: 2;
    overflow: hidden;
    background: var(--bg);
    animation: ar-in 0.4s ease;
  }
  .ar-fond {
    position: absolute;
    inset: -40px;
    background-size: cover;
    background-position: center;
    filter: blur(40px) brightness(0.45);
  }
  .ar-centre {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    padding-bottom: 120px;
  }
  img {
    width: min(360px, 40vh);
    height: auto;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 4px;
    box-shadow: 0 20px 60px rgb(0 0 0 / 0.6);
    animation: ar-pulse 1.6s ease-in-out infinite;
  }
  .ar-eq {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    height: 56px;
  }
  .ar-eq span {
    width: 10px;
    height: 100%;
    background: var(--text);
    transform-origin: bottom;
    animation: ar-eq 0.9s ease-in-out infinite alternate;
    animation-delay: calc(var(--i) * -0.17s);
  }
  @keyframes ar-in {
    from {
      opacity: 0;
    }
  }
  @keyframes ar-pulse {
    50% {
      transform: scale(1.03);
    }
  }
  @keyframes ar-eq {
    from {
      transform: scaleY(0.15);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    img,
    .ar-eq span {
      animation: none;
    }
  }
</style>
