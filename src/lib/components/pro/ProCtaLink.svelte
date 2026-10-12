<script>
  let { href, children } = $props();
</script>

<a class="pro-cta-btn" {href}>{@render children()}</a>

<style>
  .pro-cta-btn {
    display: inline-block;
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 800;
    font-family: "Barlow Condensed", sans-serif;
    padding: 12px 28px;
    border-radius: 10px;
    font-size: 0.95rem;
    transition: opacity 0.15s;
  }
  .pro-cta-btn:hover {
    opacity: 0.85;
  }
</style>
