<script>
  /** Face de carte : fond, contenu, reflet de lumière puis surcouche (textes du recto). */
  let { side, children, overlay } = $props();
</script>

<div class="zc-face zc-{side}">
  <div class="zc-bg"></div>
  {@render children()}
  <div class="zc-glare"></div>
  {@render overlay?.()}
</div>

<style>
  .zc-face {
    position: absolute;
    inset: 0;
    border-radius: 4.5cqw;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  .zc-back {
    transform: rotateY(180deg);
  }

  /* ── Fond : teinte tirée de la pochette ───────────────────────────────── */
  .zc-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    background: var(--bg-art);
    box-shadow:
      0 2.5cqw 7cqw rgb(0 0 0 / 0.5),
      inset 0 0 0 1px var(--rim);
  }

  .zc-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(
      --grain,
      repeating-linear-gradient(35deg, rgb(255 255 255 / 0.018) 0 1px, transparent 1px 4px)
    );
  }

  /* ── Lumière ──────────────────────────────────────────────────────────── */
  .zc-glare {
    position: absolute;
    z-index: 2;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      115deg,
      transparent 35%,
      color-mix(in oklab, var(--rc-light) 45%, transparent) 50%,
      transparent 65%
    );
    background-size: 250% 250%;
    background-position: var(--mx) var(--my);
    mix-blend-mode: soft-light;
    opacity: 0;
    transition: opacity 0.35s;
    pointer-events: none;
  }

  :global(.zc.is-tilting) .zc-glare {
    opacity: 1;
  }

  /* ── Verso ────────────────────────────────────────────────────────────── */
  .zc-back .zc-bg {
    background: radial-gradient(circle at 50% 28%, #1e1f24, #08080a 72%);
  }

  /* ── Pressages ────────────────────────────────────────────────────────── */
  :global(.zc[data-rarity='legendary']) .zc-front .zc-bg {
    box-shadow:
      0 2.5cqw 7cqw rgb(0 0 0 / 0.5),
      inset 0 0 0 0.7cqw #c9972f,
      inset 0 0 0 1.1cqw rgb(0 0 0 / 0.45);
  }

  :global(.zc[data-rarity='mythic']) .zc-front .zc-bg {
    background: #22061b;
  }

  :global(.zc[data-rarity='mythic']) .zc-front .zc-bg::before {
    content: '';
    position: absolute;
    inset: -20%;
    background: var(--cover) center / cover;
    filter: blur(6cqw) saturate(1.7) brightness(0.8);
  }

  :global(.zc[data-rarity='mythic']) .zc-front .zc-bg::after {
    background:
      conic-gradient(
        from calc(var(--sheen) * 2) at 70% 30%,
        rgb(255 106 213 / 0.25),
        rgb(106 216 255 / 0.18),
        rgb(199 116 255 / 0.25),
        rgb(255 106 213 / 0.25)
      ),
      linear-gradient(180deg, rgb(255 79 200 / 0.2), rgb(24 2 18 / 0.88) 72%);
  }

  /* ── Silhouette ───────────────────────────────────────────────────────── */
  :global(.zc.is-silhouette) .zc-bg {
    background: linear-gradient(165deg, #2a2c31, #111215);
  }

  /* ── Révélation de fin de manche ──────────────────────────────────────── */
  :global(.zc.is-revealing) .zc-glare {
    animation: zc-flash 0.75s ease-in-out 1.35s backwards;
  }

  @keyframes zc-flash {
    0%,
    100% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
  }
</style>
