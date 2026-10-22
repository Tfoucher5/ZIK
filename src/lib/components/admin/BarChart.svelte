<script>
  // bars : [{ label, value }] ; la dernière barre est mise en avant.
  // target : ligne d'objectif en pointillés.
  let { bars, target = 0, height = 110, partialLast = false } = $props();

  let W = $state(320);
  const TOP = 16;
  const max = $derived(Math.max(target, ...bars.map((b) => b.value), 1) * 1.1);
  const bw = $derived((W - 8) / Math.max(bars.length, 1));
  const y = (v) => TOP + (height - TOP) * (1 - v / max);
</script>

<div class="wrap" bind:clientWidth={W}>
<svg viewBox="0 0 {W} {height + 18}" role="img" aria-label={bars.map((b) => `${b.label} : ${b.value}`).join(', ')}>
  <line x1="0" x2={W} y1={height} y2={height} class="axis" />
  {#each bars as b, i (b.label)}
    {@const x = 4 + i * bw + bw * 0.18}
    {@const w = bw * 0.64}
    {@const last = i === bars.length - 1}
    <rect {x} y={y(b.value)} width={w} height={Math.max(0, height - y(b.value))} rx="4"
      class:last class:partial={last && partialLast} />
    <text x={x + w / 2} y={y(b.value) - 4} text-anchor="middle" class="val">{b.value}</text>
    <text x={x + w / 2} y={height + 14} text-anchor="middle">{b.label}</text>
  {/each}
  {#if target}
    <line x1="0" x2={W} y1={y(target)} y2={y(target)} class="target" />
    <text x={W} y={y(target) - 5} text-anchor="end" class="target-lbl">objectif {target}</text>
  {/if}
</svg>
</div>

<style>
  .wrap { min-width: 0; }
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  text { fill: var(--a-muted); font-size: 11px; font-family: inherit; }
  .val { fill: var(--a-fg); font-weight: 600; }
  .axis { stroke: var(--a-line); }
  rect { fill: rgba(255, 61, 240, 0.38); }
  rect.last { fill: var(--a-accent); }
  rect.partial { fill: none; stroke: var(--a-accent); stroke-width: 1.5; stroke-dasharray: 3 3; }
  .target { stroke: var(--a-good); stroke-dasharray: 4 4; }
  .target-lbl { fill: var(--a-good); }
</style>
