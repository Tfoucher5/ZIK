<script>
  let { n, title, aide = '', warn = false, id = undefined, children } = $props();
</script>

<section class="ligne" {id}>
  <header><span class="n">{n}</span><h2>{title}</h2>{#if aide}<span class="aide" class:warn>{aide}</span>{/if}</header>
  {@render children()}
</section>

<style>
  .ligne {
    display: grid;
    gap: 14px;
    min-width: 0;
    padding: 20px 0 6px;
    border-top: 1px solid var(--line-2);
  }
  header { display: flex; align-items: baseline; gap: 12px; }
  .n { font-family: var(--mono); font-size: 13px; color: var(--muted); }
  h2 { font-weight: 900; font-size: 2.1rem; line-height: 0.9; }
  .aide { margin-left: auto; font-size: 14px; color: var(--muted); white-space: nowrap; }
  .aide.warn { color: var(--warn); font-weight: 600; }
</style>
