<script>
  import { dicebear } from '$lib/utils.js';
  import { page } from '$app/state';
  import NotificationsMenu from '$lib/components/NotificationsMenu.svelte';
  import ThemeMenu from '$lib/components/ThemeMenu.svelte';

  /** @type {{ user: any, onLogin: () => void, onRegister: () => void, onLogout: () => void }} */
  let { user, onLogin, onRegister, onLogout } = $props();

  let dropdownOpen = $state(false);
  let themeOpen    = $state(false);

  const name   = $derived(user?.profile?.username || user?.email?.split('@')[0] || 'Joueur');
  const avatar = $derived(user?.profile?.avatar_url || dicebear(name));

  const activeSection = $derived.by(() => {
    const path = page.url.pathname;
    if (path === '/' || path === '') return 'home';
    if (path.startsWith('/rooms')) return 'rooms';
    if (path.startsWith('/playlists')) return 'playlists';
    if (path.startsWith('/classements')) return 'classements';
    if (path.startsWith('/zikle')) return 'zikle';
    if (path.startsWith('/salon')) return 'salon';
    if (path.startsWith('/docs')) return 'docs';
    if (path.startsWith('/profile') || path.startsWith('/user')) return 'profile';
    return '';
  });

  // Les deux popovers s'excluent : ouvrir l'un ferme l'autre.
  function toggleDropdown(e) {
    e.stopPropagation();
    themeOpen = false;
    dropdownOpen = !dropdownOpen;
  }

  function toggleTheme(e) {
    e.stopPropagation();
    dropdownOpen = false;
    themeOpen = !themeOpen;
  }
</script>

<svelte:window onclick={() => { dropdownOpen = false; themeOpen = false; }} />

<nav id="navbar">
  <a href="/" class="nav-logo">ZIK<span>.</span></a>

  <div class="nav-links">
    <a href="/rooms"        class="nav-link" class:active={activeSection === 'rooms'}>Rooms</a>
    <span class="nav-sep" aria-hidden="true">·</span>
    <a href="/zikle"       class="nav-link nav-link-zikle" class:active={activeSection === 'zikle'}>
      Zikle<span class="nav-zikle-dot" aria-hidden="true"></span>
    </a>
    <span class="nav-sep" aria-hidden="true">·</span>
    <a href="/playlists"   class="nav-link" class:active={activeSection === 'playlists'}>Playlists</a>
    <span class="nav-sep" aria-hidden="true">·</span>
    <a href="/classements" class="nav-link" class:active={activeSection === 'classements'}>Classements</a>
    <span class="nav-sep" aria-hidden="true">·</span>
    <a href="/docs"        class="nav-link" class:active={activeSection === 'docs'}>Aide</a>
  </div>

  <div class="nav-right">
    <a href="/salon" class="nav-salon-btn" class:active={activeSection === 'salon'}>
      <span class="nav-salon-dot"></span>
      Mode Salon
    </a>

    <ThemeMenu open={themeOpen} onToggle={toggleTheme} />

    {#if user}
      <NotificationsMenu />
      <div class="nav-profile-wrap">
        <button class="nav-avatar-wrap" onclick={toggleDropdown} aria-haspopup="true">
          <img id="nav-avatar" src={avatar} alt="" width="28" height="28">
          <span id="nav-username">{name}</span>
          <span class="nav-chevron">&#x25BE;</span>
        </button>
        <div class="nav-dropdown" class:open={dropdownOpen}>
          <div class="nav-dd-head">
            <img src={avatar} alt="" width="34" height="34" class="nav-dd-head-av" loading="lazy" decoding="async">
            <span class="nav-dd-head-info">
              <span class="nav-dd-head-name">{name}</span>
              {#if user?.profile?.elo != null}
                <span class="nav-dd-head-elo">{user.profile.elo} ELO</span>
              {/if}
            </span>
          </div>

          <span class="nav-dd-group">Mon compte</span>
          <a href="/profile"  class="nav-dd-item">Mon profil</a>
          <a href="/settings" class="nav-dd-item">Param&egrave;tres</a>

          <span class="nav-dd-group nav-dd-mobile-only">Naviguer</span>
          <a href="/classements" class="nav-dd-item nav-dd-mobile-only">Classements</a>
          <a href="/docs"        class="nav-dd-item nav-dd-mobile-only">Aide et r&egrave;gles</a>
          <a href="/soutenir"    class="nav-dd-item nav-dd-mobile-only">Soutenir ZIK</a>

          {#if user?.profile?.role === 'super_admin'}
          <hr class="nav-dd-sep">
          <a href="/admin" class="nav-dd-item nav-dd-admin">Admin</a>
          {/if}
          <hr class="nav-dd-sep">
          <button class="nav-dd-item nav-dd-logout" onclick={onLogout}>D&eacute;connexion</button>
        </div>
      </div>
    {:else}
      <div id="nav-auth">
        <button class="btn-ghost sm" onclick={onLogin}>Connexion</button>
        <button class="btn-accent sm" onclick={onRegister}>S&apos;inscrire</button>
      </div>
    {/if}
  </div>
</nav>

<nav id="bottom-nav" aria-label="Navigation principale">
  <a href="/rooms" class="bottom-nav-item" class:active={activeSection === 'rooms'}>
    <svg viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
    Rooms
  </a>
  <a href="/playlists" class="bottom-nav-item" class:active={activeSection === 'playlists'}>
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 9V3M15 12h6M12 15v6M9 12H3"/></svg>
    Playlists
  </a>
  <a href="/" class="bottom-nav-item bn-home" class:active={activeSection === 'home'} aria-label="Accueil">
    <span class="bn-home-inner">
      <svg viewBox="0 0 24 24"><polyline points="22 12 12 2 2 12"/><path d="M5 12v7a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-7"/></svg>
    </span>
  </a>
  <a href="/zikle" class="bottom-nav-item" class:active={activeSection === 'zikle'}>
    <svg viewBox="0 0 24 24"><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11h2"/></svg>
    Zikle
  </a>
  <a href="/salon" class="bottom-nav-item" class:active={activeSection === 'salon'}>
    <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
    Salon
  </a>
</nav>
