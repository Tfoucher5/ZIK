<script>
  const COLORS = ['var(--accent)', 'var(--accent2)', 'var(--gold)', 'var(--success)', '#fff'];
  const pieces = Array.from({ length: 40 }, (_, k) => ({
    x: Math.random() * 100,
    drift: (Math.random() - 0.5) * 30,
    delay: Math.random() * 0.6,
    dur: 1.8 + Math.random() * 1.4,
    rot: Math.random() * 720,
    color: COLORS[k % COLORS.length],
  }));
</script>

<div class="cf" aria-hidden="true">
  {#each pieces as p, k (k)}
    <span
      style="left:{p.x}%;--drift:{p.drift}vw;--rot:{p.rot}deg;background:{p.color};animation-delay:{p.delay}s;animation-duration:{p.dur}s"
    ></span>
  {/each}
</div>

<style>
  .cf {
    position: fixed;
    inset: 0;
    z-index: 1004;
    pointer-events: none;
    overflow: hidden;
  }
  .cf span {
    position: absolute;
    top: -16px;
    width: 9px;
    height: 14px;
    border-radius: 2px;
    animation: cf-fall linear forwards;
  }
  @keyframes cf-fall {
    to { transform: translate(var(--drift), 110vh) rotate(var(--rot)); }
  }
  @media (prefers-reduced-motion: reduce) {
    .cf { display: none; }
  }
</style>
