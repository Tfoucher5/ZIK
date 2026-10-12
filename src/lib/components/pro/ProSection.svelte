<script>
  let { title, id, children } = $props();
</script>

<section class="pro-section" {id}>
  <h2>{title}</h2>
  {@render children()}
</section>

<style>
  .pro-section[id] {
    scroll-margin-top: calc(var(--nav-h) + 16px);
  }
  .pro-section {
    margin-bottom: 36px;
    padding-bottom: 36px;
    border-bottom: 1px solid var(--border);
  }
  .pro-section h2 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 16px;
    color: var(--text);
  }
  .pro-section :global(p) {
    font-size: 0.9rem;
    color: var(--mid);
    line-height: 1.7;
    margin-bottom: 10px;
  }
  .pro-section :global(a) {
    color: var(--accent);
  }
  .pro-section :global(ul) {
    padding-left: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 14px;
  }
  .pro-section :global(ul li) {
    font-size: 0.9rem;
    color: var(--mid);
    line-height: 1.6;
    padding-left: 18px;
    position: relative;
  }
  .pro-section :global(ul li::before) {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--accent);
    font-weight: 700;
  }
</style>
