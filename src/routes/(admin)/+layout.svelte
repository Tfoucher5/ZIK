<script>
  import { onMount, setContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { createClient } from '@supabase/supabase-js';

  let { data, children } = $props();

  let ready = $state(false);
  let adminToken = $state('');
  let alerts = $state(null);
  let authSub = null;

  setContext('adminToken', { get token() { return adminToken; } });
  setContext('adminAlerts', { get value() { return alerts; }, refresh: () => loadAlerts() });

  const LOGIN = '/admin/connexion';
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
  const isLogin = $derived(page.url.pathname === LOGIN);
  const badges = $derived({
    '/admin': alerts?.todo ?? 0,
    '/admin/reparer': alerts?.issues ?? 0,
  });

  async function openSession(token) {
    const r = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.ok;
  }

  async function loadAlerts() {
    if (!adminToken) return;
    const r = await fetch(`/api/admin/alerts?token=${encodeURIComponent(adminToken)}`);
    if (r.ok) alerts = await r.json();
  }

  onMount(async () => {
    const sb = createClient(data.env.supabaseUrl, data.env.supabaseAnonKey);
    const { data: { session } } = await sb.auth.getSession();

    if (!session?.user) { goto('/'); return; }

    const { data: profile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'super_admin') { goto('/'); return; }

    adminToken = session.access_token;
    if (!(await openSession(adminToken))) { goto('/'); return; }

    if (isLogin) {
      const next = page.url.searchParams.get('next') ?? '';
      await goto(next.startsWith('/admin') ? next : '/admin', { replaceState: true, invalidateAll: true });
    }
    ready = true;

    // Supabase fait tourner l'access_token toutes les heures environ. Sans
    // écouter ce renouvellement, un onglet admin resté ouvert continue
    // d'envoyer un jeton mort et toutes les requêtes tombent en 403.
    authSub = sb.auth.onAuthStateChange((_event, s) => {
      if (s?.access_token && s.access_token !== adminToken) {
        adminToken = s.access_token;
        openSession(adminToken);
      }
    }).data;
  });

  $effect(() => () => authSub?.subscription?.unsubscribe());

  $effect(() => {
    if (!ready) return;
    loadAlerts();
    const id = setInterval(loadAlerts, 60_000);
    return () => clearInterval(id);
  });

  // L'admin est conçue en sombre : on ignore le thème choisi dans les paramètres
  $effect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    return () => document.documentElement.setAttribute('data-theme', localStorage.getItem('zik_theme') || 'dark');
  });
</script>

<svelte:head>
  <title>ZIK Admin</title>
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#0b0a10">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/admin.css">
</svelte:head>

{#if !ready}
  <p class="adm-wait">Connexion à l'admin…</p>
{:else if !isLogin}
<div class="adm-root">
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
        {#if t.href === '/admin/salons' && alerts?.live.salons > 0}
          <i class="adm-live" title="Salon en cours"></i>
        {:else if badges[t.href] > 0}
          <em class="adm-badge">{badges[t.href]}</em>
        {/if}
      </a>
    {/each}
  </nav>

  <main class="adm-main">
    {@render children()}
  </main>
</div>
{/if}

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    background: #0b0a10;
    color: #c9cdd8;
    font-family: 'Barlow', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  :global(a) { text-decoration: none; color: inherit; }

  .adm-root {
    --a-bg: #0b0a10;
    --a-surface: #15131c;
    --a-surface2: #1e1b28;
    --a-line: #2a2636;
    --a-fg: #f4f2f8;
    --a-muted: #9a95a8;
    --a-dim: #6b6578;
    --a-accent: #ff3df0;
    --a-accent-soft: rgba(255, 61, 240, 0.14);
    --a-cyan: #22d3ee;
    --a-violet: #a78bfa;
    --a-good: #4ade80;
    --a-warn: #fbbf24;
    --a-bad: #f87171;
    --a-good-soft: rgba(74, 222, 128, 0.13);
    --a-warn-soft: rgba(251, 191, 36, 0.13);
    --a-bad-soft: rgba(248, 113, 113, 0.14);
    --a-display: 'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif;
    --a-tabs-h: 64px;
    min-height: 100vh;
  }

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
  .adm-logo { display: none; }
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

  .adm-wait { padding: 40vh 16px 0; text-align: center; color: #9a95a8; }
  .adm-live {
    position: absolute;
    top: 6px;
    left: calc(50% + 8px);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--a-good);
  }

  .adm-main {
    padding: 0 16px calc(var(--a-tabs-h) + 24px + env(safe-area-inset-bottom, 0px));
    width: 100%;
    max-width: 1240px;
    margin: 0 auto;
    min-width: 0;
  }
  /* Écrans pas encore refaits : ils n'ont pas leur propre en-tête */
  .adm-main > :global(:first-child:not(.adm-page)) { margin-top: 24px; }

  @media (min-width: 900px) {
    .adm-root {
      --a-tabs-h: 0px;
      display: grid;
      grid-template-columns: 210px minmax(0, 1fr);
    }
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
    .adm-main { padding: 0 28px 32px; }
  }
</style>
