<script>
  /** icon: string (emoji), title: string, description: string, href: string|null */
  let { icon = null, title, description, href = null } = $props();
  const tag = href ? 'a' : 'div';
</script>

<svelte:element this={tag} class="glass-card" {href}>
  {#if icon}<div class="gc-icon">{icon}</div>{/if}
  <div class="gc-title">{title}</div>
  <div class="gc-desc">{description}</div>
</svelte:element>

<style>
  .glass-card {
    background: #111;
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 22px;
    position: relative;
    overflow: hidden;
    transition: background 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s;
    display: block;
    color: var(--text);
  }
  .glass-card:hover {
    background: #161616;
    border-color: var(--border2);
    transform: translateY(-3px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  }
  .gc-icon { font-size: 1.5rem; margin-bottom: 12px; }
  .gc-title { font-size: 0.92rem; font-weight: 700; margin-bottom: 6px; color: var(--text); }
  .gc-desc { font-size: 0.78rem; color: var(--mid); line-height: 1.55; }
</style>
