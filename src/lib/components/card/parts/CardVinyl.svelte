<script>
  let { back = false } = $props();
</script>

<div class="zc-vinyl" class:zc-back-vinyl={back}><div class="zc-label"></div></div>

<style>
  .zc-vinyl {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--disc);
    box-shadow:
      0 1.5cqw 4cqw rgb(0 0 0 / 0.55),
      inset 0 0 0 0.3cqw rgb(255 255 255 / 0.08),
      inset 0 0 0 0.75cqw rgb(0 0 0 / 0.32);
  }

  /* Sillons fins + trois plages plus sombres entre les morceaux, zone lisse
     autour de l'étiquette et sur le bord, comme sur un vrai disque */
  .zc-vinyl::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background:
      radial-gradient(
        circle closest-side,
        transparent 0 57%,
        rgb(0 0 0 / 0.22) 57.8% 58.3%,
        transparent 59% 71%,
        rgb(0 0 0 / 0.22) 71.8% 72.3%,
        transparent 73% 84%,
        rgb(0 0 0 / 0.22) 84.8% 85.3%,
        transparent 86%
      ),
      repeating-radial-gradient(
        circle closest-side,
        rgb(255 255 255 / var(--groove)) 0 0.1cqw,
        transparent 0.1cqw 0.42cqw
      );
    mask: radial-gradient(circle closest-side, transparent 0 46%, #000 47% 95%, transparent 96%);
  }

  :global(.zc.disc-out) .zc-vinyl {
    animation: zc-spin 1.8s linear 0.8s infinite;
  }

  /* Étiquette : la pochette en rond, cerclée de la couleur de la rareté */
  .zc-label {
    position: absolute;
    inset: 31%;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--cover) center / cover;
    box-shadow:
      0 0 0 0.5cqw var(--rc),
      0 0 0 0.9cqw rgb(0 0 0 / 0.45),
      inset 0 0 2cqw rgb(0 0 0 / 0.35);
  }

  .zc-label::after {
    content: '';
    width: 2.4cqw;
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle, #050506 55%, #2a2a2e);
    box-shadow: 0 0 0 0.35cqw rgb(255 255 255 / 0.25);
  }

  /* ── Verso ────────────────────────────────────────────────────────────── */
  .zc-back-vinyl {
    inset: auto;
    top: 7cqw;
    left: 14cqw;
    width: 72cqw;
    height: 72cqw;
  }

  /* ── Pressages ────────────────────────────────────────────────────────── */
  :global(.zc[data-rarity='rare']) .zc-vinyl {
    backdrop-filter: blur(1.5px) saturate(1.4);
  }

  :global(.zc[data-rarity='legendary']) .zc-vinyl::after,
  :global(.zc[data-rarity='mythic']) .zc-vinyl::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--flake-c);
    opacity: var(--flake-disc-o);
    mask:
      var(--noise) 0 0 / 160px 160px,
      radial-gradient(circle closest-side, transparent 0 46%, #000 47% 95%, transparent 96%);
    mask-composite: intersect;
    mix-blend-mode: screen;
  }

  /* ── Silhouette ───────────────────────────────────────────────────────── */
  :global(.zc.is-silhouette) .zc-label {
    background: #2a2c31;
  }

  /* ── Révélation de fin de manche ──────────────────────────────────────── */
  :global(.zc.is-revealing) .zc-vinyl {
    animation: zc-spin 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s backwards;
  }

  @keyframes zc-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
