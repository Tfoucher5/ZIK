<script>
  let { title, children } = $props();
</script>

<header class="ph">
  <h1>{title}</h1>
  {@render children?.()}
</header>

<style>
  .ph {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 -16px;
    padding: 12px 16px;
    background: rgba(11, 10, 16, 0.92);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--a-line);
  }
  h1 {
    flex: 1;
    font-family: var(--a-display);
    font-size: 1.5rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--a-fg);
  }
  @media (min-width: 900px) {
    .ph { margin: 0 -28px; padding: 16px 28px; }
  }
</style>
