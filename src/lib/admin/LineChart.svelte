<script>
  // points : [{ label, value }] dans l'ordre chronologique
  let { points, height = 120, color = 'var(--a-accent)' } = $props();

  let W = $state(320);
  const PAD = 6;
  const max = $derived(Math.max(...points.map((p) => p.value), 1));
  const x = (i) => PAD + (i * (W - PAD * 2)) / Math.max(points.length - 1, 1);
  const y = (v) => PAD + (height - PAD * 2) * (1 - v / max);
  const line = $derived(points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(''));
  const area = $derived(points.length ? `${line}L${x(points.length - 1)},${height}L${x(0)},${height}Z` : '');
  const peak = $derived(points.reduce((b, p, i) => (p.value > (points[b]?.value ?? -1) ? i : b), 0));
  let hover = $state(null);

  function move(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - PAD) / (r.width - PAD * 2)) * (points.length - 1));
    hover = Math.min(points.length - 1, Math.max(0, i));
  }
</script>

<div class="wrap" bind:clientWidth={W}>
  <svg
    viewBox="0 0 {W} {height}"
    role="img"
    aria-label={points.map((p) => `${p.label} : ${p.value}`).join(', ')}
    onpointermove={move}
    onpointerleave={() => (hover = null)}
  >
    <path d={area} fill={color} opacity="0.12" />
    <path d={line} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" />
    {#if points.length}
      {@const i = hover ?? peak}
      <line x1={x(i)} x2={x(i)} y1={PAD} y2={height} class="guide" />
      <circle cx={x(i)} cy={y(points[i].value)} r="4" fill={color} />
    {/if}
  </svg>
  {#if points.length}
    {@const i = hover ?? peak}
    <p class="tip">
      <b>{points[i].value}</b> · {points[i].label}{hover === null ? ' (record)' : ''}
    </p>
  {/if}
</div>

<style>
  .wrap { width: 100%; }
  svg { display: block; width: 100%; height: auto; touch-action: pan-y; }
  .guide { stroke: var(--a-line); stroke-dasharray: 3 3; }
  .tip { margin-top: 4px; font-size: 0.78rem; color: var(--a-dim); }
  .tip b { color: var(--a-fg); }
</style>
