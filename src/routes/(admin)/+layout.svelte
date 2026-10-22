<script>
  import { onMount, setContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { createClient } from '@supabase/supabase-js';
  import AdminNav from '$lib/components/admin/AdminNav.svelte';

  let { data, children } = $props();

  let ready = $state(false);
  let adminToken = $state('');
  let alerts = $state(null);
  let authSub = null;

  setContext('adminToken', { get token() { return adminToken; } });
  setContext('adminAlerts', { get value() { return alerts; }, refresh: () => loadAlerts() });

  const LOGIN = '/admin/connexion';
  const isLogin = $derived(page.url.pathname === LOGIN);

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
  {#each ["blocks", "layout"] as f (f)}<link rel="stylesheet" href="/css/admin/{f}.css?v=3.19.0">{/each}
</svelte:head>

{#if !ready}
  <p class="adm-wait">Connexion à l'admin…</p>
{:else if !isLogin}
<div class="adm-root">
  <AdminNav {alerts} />

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

  .adm-wait { padding: 40vh 16px 0; text-align: center; color: #9a95a8; }

  .adm-main {
    padding: 0 16px calc(var(--a-tabs-h) + 24px + env(safe-area-inset-bottom, 0px));
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    min-width: 0;
  }
  /* Écrans pas encore refaits : ils n'ont pas leur propre en-tête */
  .adm-main > :global(:first-child:not(.adm-page)) { margin-top: 24px; }

  @media (min-width: 900px) {
    .adm-root {
      --a-tabs-h: 0px;
      display: grid;
      grid-template-columns: 230px minmax(0, 1fr);
    }
    .adm-main { padding: 0 28px 32px; }
  }
</style>
