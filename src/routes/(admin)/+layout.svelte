<script>
  import { onMount, setContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { createClient } from '@supabase/supabase-js';

  let { data, children } = $props();

  let adminUsername = $state('');
  let ready = $state(false);
  let adminToken = $state('');
  let authSub = null;

  setContext('adminToken', { get token() { return adminToken; } });

  onMount(async () => {
    const sb = createClient(data.env.supabaseUrl, data.env.supabaseAnonKey);
    const { data: { session } } = await sb.auth.getSession();

    if (!session?.user) { goto('/'); return; }

    const { data: profile } = await sb
      .from('profiles')
      .select('role, username')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'super_admin') { goto('/'); return; }

    adminUsername = profile.username || session.user.email;
    adminToken = session.access_token;
    ready = true;

    // Supabase fait tourner l'access_token toutes les heures environ. Sans
    // écouter ce renouvellement, un onglet admin resté ouvert continue
    // d'envoyer un jeton mort et toutes les requêtes tombent en 403.
    authSub = sb.auth.onAuthStateChange((_event, s) => {
      if (s?.access_token) adminToken = s.access_token;
    }).data;

    fetch(`/api/admin/maintenance-bypass?token=${encodeURIComponent(adminToken)}`).catch(() => {});
  });

  // onMount ignore la valeur de retour d'un callback async : le nettoyage de la
  // souscription passe par un effet.
  $effect(() => () => authSub?.subscription?.unsubscribe());
</script>

<svelte:head>
  <title>ZIK Admin</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
</svelte:head>

{#if ready}
<div class="adm-root">
  <nav class="adm-nav">
    <a href="/" class="adm-logo">ZIK</a>
    <div class="adm-nav-links">
      <a href="/admin/dashboard" class="adm-nav-link">Dashboard</a>
      <a href="/admin/users"     class="adm-nav-link">Users</a>
      <a href="/admin/reports"   class="adm-nav-link">Reports</a>
      <a href="/admin/rooms"     class="adm-nav-link">Rooms</a>
      <a href="/admin/playlists" class="adm-nav-link">Playlists</a>
      <a href="/admin/tracks"    class="adm-nav-link">Tracks</a>
      <a href="/admin/achievements" class="adm-nav-link">Achievements</a>
      <a href="/admin/zikle"     class="adm-nav-link">Zikle</a>
      <a href="/admin/live"      class="adm-nav-link">Live</a>
      <a href="/admin/errors"    class="adm-nav-link">Errors</a>
    </div>
    <div class="adm-nav-user">
      <span class="adm-badge">ROOT</span>
      <span class="adm-username">{adminUsername}</span>
    </div>
  </nav>

  <main class="adm-main">
    {@render children()}
  </main>
</div>
{/if}

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    background: #0d0f14;
    color: #c9cdd8;
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  :global(a) { text-decoration: none; color: inherit; }

  .adm-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .adm-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 24px;
    height: 52px;
    background: #13161e;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .adm-logo {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 1rem;
    color: #e2e8f0;
    margin-right: 16px;
    letter-spacing: -0.02em;
  }

  .adm-nav-links { display: flex; gap: 2px; flex: 1; }
  .adm-nav-link {
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    color: #6b7280;
    transition: background 0.15s, color 0.15s;
  }
  .adm-nav-link:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #e2e8f0;
  }

  .adm-nav-user { display: flex; align-items: center; gap: 10px; margin-left: auto; }
  .adm-badge {
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 4px;
    padding: 2px 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
  }
  .adm-username {
    font-size: 0.78rem;
    color: #4b5563;
  }

  .adm-main {
    flex: 1;
    padding: 28px 28px;
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
  }
</style>
