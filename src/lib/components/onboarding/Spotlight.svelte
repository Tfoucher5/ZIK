<script>
  /** @type {{ rect: { top: number, left: number, width: number, height: number } | null, clickable: boolean }} */
  let { rect, clickable } = $props();

  // Bloque les clics partout sauf dans le trou quand la cible est manipulable.
  const clip = $derived.by(() => {
    if (!rect || !clickable) return 'none';
    const { top: t, left: l } = rect;
    const r = l + rect.width;
    const b = t + rect.height;
    return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l}px ${t}px, ${r}px ${t}px, ${r}px ${b}px, ${l}px ${b}px, ${l}px ${t}px)`;
  });
</script>

<div class="sl-block" class:dim={!rect} style="clip-path:{clip}"></div>
{#if rect}
  <div
    class="sl-ring"
    class:live={clickable}
    style="top:{rect.top}px;left:{rect.left}px;width:{rect.width}px;height:{rect.height}px"
  ></div>
{/if}

<style>
  .sl-block {
    --sl-dim: rgb(0 0 0 / 0.7);
    position: fixed;
    inset: 0;
    z-index: 1000;
    transition: background 0.4s ease;
  }
  .sl-block.dim {
    background: var(--sl-dim);
    backdrop-filter: blur(3px);
  }

  .sl-ring {
    --sl-dim: rgb(0 0 0 / 0.7);
    position: fixed;
    z-index: 1001;
    border-radius: 14px;
    border: 2px solid rgb(var(--accent-rgb) / 0.9);
    box-shadow:
      0 0 0 9999px var(--sl-dim),
      0 0 28px rgb(var(--accent-rgb) / 0.55);
    pointer-events: none;
    transition:
      top 0.5s cubic-bezier(0.65, 0, 0.35, 1),
      left 0.5s cubic-bezier(0.65, 0, 0.35, 1),
      width 0.5s cubic-bezier(0.65, 0, 0.35, 1),
      height 0.5s cubic-bezier(0.65, 0, 0.35, 1);
    animation: sl-in 0.4s ease;
  }
  .sl-ring.live::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    border: 2px solid var(--accent);
    animation: sl-wave 1.6s ease-out infinite;
  }

  @keyframes sl-in {
    from { opacity: 0; transform: scale(1.15); }
  }
  @keyframes sl-wave {
    from { opacity: 0.9; transform: scale(1); }
    to { opacity: 0; transform: scale(1.25); }
  }

  @media (prefers-reduced-motion: reduce) {
    .sl-ring, .sl-ring.live::after { animation: none; transition: none; }
  }
</style>
