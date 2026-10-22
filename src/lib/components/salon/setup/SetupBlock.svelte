<script>
  let { letter, title, children } = $props();
</script>

<section class="st-block">
  <h2><span>{letter}</span>{title}</h2>
  {@render children()}
</section>

<style>
  .st-block {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 24px;
    padding: 40px 0;
    border-bottom: 1px solid var(--border);
  }
  .st-block h2 {
    font-family: var(--s-cond);
    font-weight: 800;
    font-size: 1.6rem;
    text-transform: uppercase;
    line-height: 1;
  }
  .st-block h2 span {
    display: block;
    margin-bottom: 8px;
    font-family: var(--s-mono);
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--dim);
  }

  @media (max-width: 760px) {
    .st-block { grid-template-columns: 1fr; gap: 18px; padding: 30px 0; }
    .st-block h2 span { display: inline; margin: 0 10px 0 0; }
  }
</style>
