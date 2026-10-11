<script>
  let { covers = [], seed = 0, emoji = '🎵' } = $props();

  // Pochettes dont le lien est mort : écartées, la grille se recompose.
  let failed = $state([]);
  const ok = $derived(covers.filter((c) => !failed.includes(c)));
  const four = $derived(ok.length >= 4 ? ok.slice(0, 4) : null);
  const fail = (c) => { failed = [...failed, c]; };
</script>

<div class="rcov" class:grid={four} style="--h:{(seed * 53) % 360}">
  {#if four}
    {#each four as c, i (c + i)}<img src={c} alt="" loading="lazy" decoding="async" onerror={() => fail(c)}>{/each}
  {:else if ok.length}
    <img src={ok[0]} alt="" loading="lazy" decoding="async" onerror={() => fail(ok[0])}>
  {:else}
    <span class="rcov-emoji" aria-hidden="true">{emoji}</span>
  {/if}
</div>

<style>
  .rcov {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: linear-gradient(135deg, hsl(var(--h) 45% 22%), hsl(calc(var(--h) + 90) 45% 12%));
  }
  .rcov.grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: minmax(0, 1fr) minmax(0, 1fr); gap: 2px; }
  .rcov img { width: 100%; height: 100%; min-height: 0; object-fit: cover; display: block; }
  .rcov-emoji { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 2.4rem; }
</style>
