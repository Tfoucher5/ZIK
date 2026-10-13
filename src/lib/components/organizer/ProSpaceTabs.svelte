<script>
  let { active } = $props();

  const TABS = [
    { id: 'dashboard', label: 'Tableau de bord', href: '/profile' },
    { id: 'venue', label: 'Mon lieu et la TV', href: '/pro/lieu' },
    { id: 'player', label: 'Profil joueur', href: '/profile?vue=joueur' },
  ];
</script>

<nav class="pt" aria-label="Espace organisateur">
  <span class="pt-badge">ZIK Pro</span>
  <div class="pt-tabs">
    {#each TABS as t (t.id)}
      <a href={t.href} class:on={active === t.id} aria-current={active === t.id ? 'page' : undefined}>{t.label}</a>
    {/each}
  </div>
</nav>

<style>
  .pt {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 28px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
  }
  .pt-badge {
    flex: none;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif;
    font-size: 0.78rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .pt-tabs { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
  .pt-tabs a {
    flex: none;
    padding: 8px 14px;
    border-radius: 10px;
    color: var(--mid);
    font-size: 0.9rem;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
  }
  .pt-tabs a:hover { color: var(--text); background: var(--surface); }
  .pt-tabs a.on { color: var(--text); background: var(--surface2); }
  @media (max-width: 600px) {
    .pt-badge { display: none; }
    .pt { margin-left: -16px; margin-right: -16px; padding-left: 12px; }
  }
</style>
