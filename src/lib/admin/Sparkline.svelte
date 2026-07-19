<script>
  let { points = [], width = 120, height = 32, color = 'var(--adm-accent)' } = $props();

  const path = $derived.by(() => {
    if (points.length < 2) return '';
    const max = Math.max(...points, 1);
    const stepX = width / (points.length - 1);
    return points
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`)
      .join(' ');
  });
</script>

{#if path}
  <svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true">
    <path d={path} fill="none" stroke={color} stroke-width="1.5" stroke-linejoin="round" />
  </svg>
{/if}
