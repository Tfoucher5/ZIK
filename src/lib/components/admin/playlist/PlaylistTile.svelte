<script>
  /** Tuile emoji d'une playlist, liserée si elle est officielle. */
  let { emoji, official = false, small = false } = $props();
</script>

<span class="tile" class:official class:small>{emoji}</span>

<style>
  .tile {
    flex: 0 0 44px;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--a-surface2), var(--a-accent-soft));
    font-size: 1.4rem;
  }
  .tile.official { box-shadow: inset 0 0 0 2px var(--a-warn); }
  .tile.small { flex-basis: 34px; width: 34px; height: 34px; font-size: 1.1rem; border-radius: 8px; }
</style>
