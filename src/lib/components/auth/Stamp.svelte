<script>
  /** @type {{ label: string, on?: boolean, resa?: boolean }} */
  let { label, on = false, resa = false } = $props();
</script>

<div class="stamp" class:on class:resa>{label}</div>

<style>
  /* tampon — pointer-events none : ne bloque jamais l'œil ni le bouton */
  .stamp {
    position: absolute; right: 14px; bottom: 10px; z-index: 4;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.5rem;
    letter-spacing: 0.24em; text-transform: uppercase; color: var(--success, #4ade80);
    border: 4px solid var(--success, #4ade80); border-radius: 6px; padding: 6px 16px;
    transform: rotate(-14deg) scale(3); opacity: 0; pointer-events: none;
    transition: transform 0.35s cubic-bezier(0.2, 2, 0.4, 1) 0.5s, opacity 0.25s ease 0.5s;
  }
  .stamp.on { transform: rotate(-14deg) scale(1); opacity: 0.95; }
  .stamp.resa { position: static; display: inline-block; margin: 14px 0 0; color: var(--accent); border-color: var(--accent); transition: none; }

  @media (prefers-reduced-motion: reduce) {
    .stamp { transition: none !important; }
  }
  :global(.no-animations) .stamp { transition: none !important; }
</style>
