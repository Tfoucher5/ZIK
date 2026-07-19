<script>
  let { series = [] } = $props();

  const W = 900, H = 260, PAD = { t: 12, r: 12, b: 26, l: 36 };
  let hoverIdx = $state(null);

  const xDates = $derived(series[0]?.points.map((p) => p.x) ?? []);
  const maxY = $derived(Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y))));
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const px = (i) => PAD.l + (xDates.length < 2 ? 0 : (i / (xDates.length - 1)) * innerW);
  const py = (v) => PAD.t + innerH - (v / maxY) * innerH;
  const linePath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ');

  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const yTicks = $derived([0, 0.5, 1].map((f) => Math.round(maxY * f)));

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W - PAD.l;
    hoverIdx = Math.max(0, Math.min(xDates.length - 1, Math.round((x / innerW) * (xDates.length - 1))));
  }
</script>

<div class="chart">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg viewBox="0 0 {W} {H}" onmousemove={onMove} onmouseleave={() => (hoverIdx = null)}>
    {#each yTicks as t (t)}
      <line x1={PAD.l} x2={W - PAD.r} y1={py(t)} y2={py(t)} class="grid" />
      <text x={PAD.l - 8} y={py(t) + 4} class="tick" text-anchor="end">{t}</text>
    {/each}
    {#each series as s (s.label)}
      <path d={linePath(s.points)} fill="none" stroke={s.color} stroke-width="2" stroke-linejoin="round" />
    {/each}
    {#if xDates.length > 1}
      <text x={PAD.l} y={H - 6} class="tick">{fmtDate(xDates[0])}</text>
      <text x={W - PAD.r} y={H - 6} class="tick" text-anchor="end">{fmtDate(xDates.at(-1))}</text>
    {/if}
    {#if hoverIdx !== null}
      <line x1={px(hoverIdx)} x2={px(hoverIdx)} y1={PAD.t} y2={H - PAD.b} class="cursor" />
      {#each series as s (s.label)}
        {#if s.points[hoverIdx]}
          <circle cx={px(hoverIdx)} cy={py(s.points[hoverIdx].y)} r="3.5" fill={s.color} />
        {/if}
      {/each}
    {/if}
  </svg>
  {#if hoverIdx !== null && xDates[hoverIdx]}
    <div class="tooltip" style="left: {(px(hoverIdx) / W) * 100}%">
      <div class="tt-date">{fmtDate(xDates[hoverIdx])}</div>
      {#each series as s (s.label)}
        <div class="tt-row"><span class="dot" style="background:{s.color}"></span>{s.label} : <b>{s.points[hoverIdx]?.y ?? 0}</b></div>
      {/each}
    </div>
  {/if}
  <div class="legend">
    {#each series as s (s.label)}
      <span class="legend-item"><span class="dot" style="background:{s.color}"></span>{s.label}</span>
    {/each}
  </div>
</div>

<style>
  .chart { position: relative; }
  svg { width: 100%; height: auto; display: block; }
  .grid { stroke: var(--adm-border); stroke-width: 1; }
  .cursor { stroke: var(--adm-muted); stroke-width: 1; stroke-dasharray: 3 3; }
  .tick { fill: var(--adm-muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
  .tooltip {
    position: absolute; top: 0; transform: translateX(-50%);
    background: var(--adm-panel); border: 1px solid var(--adm-border);
    border-radius: 10px; padding: 8px 12px; font-size: 0.78rem;
    pointer-events: none; white-space: nowrap; z-index: 5; color: var(--adm-text);
  }
  .tt-date { color: var(--adm-muted); margin-bottom: 4px; }
  .tt-row { display: flex; align-items: center; gap: 6px; }
  .legend { display: flex; gap: 16px; margin-top: 10px; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--adm-muted); }
  .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
</style>
