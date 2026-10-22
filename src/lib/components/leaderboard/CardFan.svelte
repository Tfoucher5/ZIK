<script>
  import Card from '$lib/components/card/Card.svelte';

  /** Éventail de cartes : la plus rare au centre, devant. */
  let { cards } = $props();

  // cards est trié de la plus rare à la moins rare : la plus rare va au centre
  const slotOf = (i, n) => (n === 3 ? [1, 0, 2][i] : i);
</script>

<div class="fan" style:--n={cards.length}>
  {#each cards as c, i (c.id)}
    <div class="fan-card" style:--i={slotOf(i, cards.length)} style:z-index={10 - i}>
      <Card card={c} size="sm" inspectable list={cards} />
    </div>
  {/each}
</div>

<style>
  .fan {
    position: relative;
    height: 100%;
    min-height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .fan-card {
    --spread: calc((var(--i) - (var(--n) - 1) / 2));
    position: absolute;
    transform: translateX(calc(var(--spread) * 72px)) rotate(calc(var(--spread) * 9deg))
      translateY(calc(var(--spread) * var(--spread) * 8px));
    transition: transform 0.25s ease;
  }
  .fan:hover .fan-card {
    transform: translateX(calc(var(--spread) * 92px)) rotate(calc(var(--spread) * 12deg))
      translateY(calc(var(--spread) * var(--spread) * 10px));
  }

  @media (max-width: 960px) {
    .fan {
      min-height: 250px;
    }
  }
  @media (max-width: 640px) {
    .fan-card {
      transform: translateX(calc(var(--spread) * 58px)) rotate(calc(var(--spread) * 8deg))
        translateY(calc(var(--spread) * var(--spread) * 6px)) scale(0.85);
    }
  }
</style>
