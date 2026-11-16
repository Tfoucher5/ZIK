<script>
  /** Bandeau du haut à la couleur de l'équipe : « Tu joues pour Rouge ». */
  let { name, color, children } = $props();
</script>

<div class="sp-band" style:--tc={color}>
  <span>Tu joues pour <b>{name}</b></span>
  {@render children?.()}
</div>

<style>
  .sp-band {
    margin: -22px -16px 0;
    padding: calc(12px + env(safe-area-inset-top)) 16px 12px;
    min-height: 60px;
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--tc);
    color: #000;
    font-family: var(--s-cond);
    font-weight: 800;
    font-size: 1.5rem;
    line-height: 1;
    text-transform: uppercase;
  }
  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  b {
    font-weight: 900;
  }
</style>
