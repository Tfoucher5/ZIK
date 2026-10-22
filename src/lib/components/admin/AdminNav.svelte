<script>
  import { page } from '$app/state';

  /** Navigation de l'admin : onglets en bas sur mobile, barre latérale sur PC. */
  let { alerts } = $props();

  const TABS = [
    { href: '/admin', label: 'Accueil', icon: 'home' },
    { href: '/admin/salons', label: 'Salons', icon: 'tv' },
    { href: '/admin/reparer', label: 'Réparer', icon: 'tool' },
    { href: '/admin/argent', label: 'Argent', icon: 'money' },
    { href: '/admin/plus', label: 'Plus', icon: 'more' },
  ];
  // Les autres écrans (joueurs, journal, réglages…) se rangent sous « Plus »
  const activeTab = $derived.by(() => {
    const p = page.url.pathname;
    if (p === '/admin') return '/admin';
    return TABS.find((t) => t.href !== '/admin' && p.startsWith(t.href))?.href ?? '/admin/plus';
  });
  // Sur PC, la barre latérale montre directement ce que « Plus » regroupe
  const MORE = [
    { title: 'Suivre', links: [
      ['/admin/chiffres', 'Chiffres'], ['/admin/journal', 'Journal'], ['/admin/live', 'Rooms en direct'], ['/admin/errors', 'Erreurs'],
    ] },
    { title: 'Gérer', links: [
      ['/admin/users', 'Joueurs'], ['/admin/reports', 'Messages'], ['/admin/prospection', 'Prospection'],
      ['/admin/playlists', 'Playlists'], ['/admin/tracks', 'Titres'], ['/admin/cards', 'Cartes'], ['/admin/rooms', 'Rooms'],
      ['/admin/zikle', 'Zikle'], ['/admin/defi', 'Défi de la semaine'], ['/admin/achievements', 'Succès'],
    ] },
    { title: 'Site', links: [['/admin/reglages', 'Réglages']] },
  ];
  const badges = $derived({
    '/admin': alerts?.todo ?? 0,
    '/admin/reparer': alerts?.issues ?? 0,
    '/admin/salons': alerts?.live.calls ?? 0,
  });
</script>

<nav class="adm-tabs" aria-label="Sections de l'admin">
  <a href="/" class="adm-logo">ZIK <span>admin</span></a>
  {#each TABS as t (t.href)}
    <a href={t.href} class="adm-tab" class:on={activeTab === t.href} aria-current={activeTab === t.href ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {#if t.icon === 'home'}
          <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        {:else if t.icon === 'tv'}
          <rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" />
        {:else if t.icon === 'tool'}
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />
        {:else if t.icon === 'money'}
          <rect x="2" y="6" width="20" height="13" rx="2" /><circle cx="12" cy="12.5" r="2.5" />
        {:else}
          <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
        {/if}
      </svg>
      <span>{t.label}</span>
      {#if badges[t.href] > 0}
        <em class="adm-badge" title={t.href === '/admin/salons' ? 'Salon qui appelle un admin' : null}>{badges[t.href]}</em>
      {:else if t.href === '/admin/salons' && alerts?.live.salons > 0}
        <i class="adm-live" title="Salon en cours"></i>
      {/if}
    </a>
  {/each}
  {#each MORE as g (g.title)}
    <div class="adm-group">
      <span>{g.title}</span>
      {#each g.links as [href, label] (href)}
        <a {href} class:on={page.url.pathname.startsWith(href)}>{label}</a>
      {/each}
    </div>
  {/each}
</nav>

<style>
  .adm-tabs {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0px));
    background: rgba(21, 19, 28, 0.96);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--a-line);
  }
  .adm-logo, .adm-group { display: none; }
  .adm-tab {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 3px;
    padding: 6px 0;
    border-radius: 12px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--a-dim);
  }
  .adm-tab svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .adm-tab.on { color: var(--a-accent); }
  .adm-tab.on::before {
    content: '';
    position: absolute;
    top: -6px;
    width: 28px;
    height: 3px;
    border-radius: 0 0 3px 3px;
    background: var(--a-accent);
  }
  .adm-badge {
    position: absolute;
    top: 2px;
    left: calc(50% + 6px);
    padding: 1px 5px;
    border-radius: 99px;
    background: var(--a-bad);
    color: #2a0606;
    font-size: 0.62rem;
    font-style: normal;
    font-weight: 800;
  }

  .adm-live {
    position: absolute;
    top: 6px;
    left: calc(50% + 8px);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--a-good);
  }

  @media (min-width: 900px) {
    .adm-tabs {
      position: sticky;
      top: 0;
      height: 100vh;
      grid-auto-flow: row;
      grid-auto-rows: max-content;
      gap: 4px;
      padding: 20px 12px;
      border-top: 0;
      border-right: 1px solid var(--a-line);
    }
    .adm-logo {
      display: block;
      padding: 0 12px 16px;
      font-family: var(--a-display);
      font-size: 1.45rem;
      font-weight: 800;
      color: var(--a-fg);
    }
    .adm-logo span { color: var(--a-accent); }
    .adm-tab {
      grid-template-columns: 22px 1fr auto;
      justify-items: start;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      font-size: 0.92rem;
    }
    .adm-tab:hover { background: var(--a-surface); color: var(--a-fg); }
    .adm-tab.on { background: var(--a-accent-soft); }
    .adm-tab.on::before { display: none; }
    .adm-badge, .adm-live { position: static; }
    .adm-tab[href='/admin/plus'] { display: none; }
    .adm-tabs { overflow-y: auto; }
    .adm-group { display: grid; gap: 1px; margin-top: 14px; }
    .adm-group span {
      padding: 0 12px 4px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--a-dim);
    }
    .adm-group a { padding: 6px 12px; border-radius: 8px; font-size: 0.86rem; color: var(--a-muted); }
    .adm-group a:hover { background: var(--a-surface); color: var(--a-fg); }
    .adm-group a.on { background: var(--a-accent-soft); color: var(--a-fg); }
  }
</style>
