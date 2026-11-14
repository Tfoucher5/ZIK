<script>
  import { dicebear } from '$lib/shared/utils.js';
  import { page } from '$app/state';
  import NotificationsMenu from '$lib/components/layout/NotificationsMenu.svelte';
  import ThemeMenu from '$lib/components/layout/ThemeMenu.svelte';
  import { universOf } from '$lib/components/layout/univers.js';

  /** @type {{ user: any, onLogin: () => void, onRegister: () => void, onLogout: () => void }} */
  let { user, onLogin, onRegister, onLogout } = $props();

  let dropdownOpen = $state(false);
  let themeOpen    = $state(false);

  const name   = $derived(user?.profile?.username || user?.email?.split('@')[0] || 'Joueur');
  const avatar = $derived(user?.profile?.avatar_url || dicebear(name));

  const univers = $derived(universOf(page.url.pathname));

  const activeSection = $derived.by(() => {
    const path = page.url.pathname;
    if (path === '/jouer') return 'jouer';
    if (path === '/soiree') return 'soiree';
    if (path === '/pro' || path.startsWith('/pro/')) return 'pro';
    if (path.startsWith('/rooms')) return 'rooms';
    if (path.startsWith('/playlists')) return 'playlists';
    if (path.startsWith('/classements')) return 'classements';
    if (path.startsWith('/cartes') || path.startsWith('/carte/') || path.startsWith('/collection')) return 'cartes';
    if (path.startsWith('/zikle')) return 'zikle';
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

  {#if univers === 'jeu'}
    <div class="nav-links">
      <a href="/rooms"        class="nav-link" class:active={activeSection === 'rooms'}>Rooms</a>
      <span class="nav-sep" aria-hidden="true">·</span>
      <a href="/zikle"       class="nav-link nav-link-zikle" class:active={activeSection === 'zikle'}>
        Zikle<span class="nav-zikle-dot" aria-hidden="true"></span>
      </a>
      <span class="nav-sep" aria-hidden="true">·</span>
      <a href="/playlists"   class="nav-link" class:active={activeSection === 'playlists'}>Playlists</a>
      <span class="nav-sep" aria-hidden="true">·</span>
      <a href="/cartes"      class="nav-link" class:active={activeSection === 'cartes'}>Cartes</a>
      <span class="nav-sep" aria-hidden="true">·</span>
      <a href="/classements" class="nav-link" class:active={activeSection === 'classements'}>Classements</a>
      <span class="nav-sep" aria-hidden="true">·</span>
      <a href="/docs"        class="nav-link nav-link-aide" class:active={activeSection === 'docs'}>Aide</a>
    </div>
  {:else if univers === 'soiree'}
    <div class="nav-links">
      <a href="/soiree"      class="nav-link" class:active={activeSection === 'soiree'}>Découvrir</a>
      <span class="nav-sep" aria-hidden="true">·</span>
      <a href="/pro"         class="nav-link" class:active={activeSection === 'pro'}>Tarifs</a>
      <span class="nav-sep" aria-hidden="true">·</span>
      <a href="/soiree#faq"  class="nav-link">Aide</a>
    </div>
  {/if}

  <div class="nav-right">
    {#if univers === 'jeu'}
      <a href="/soiree" class="nav-switch">ZIK Soirée</a>
    {:else if univers === 'soiree'}
      <a href="/jouer" class="nav-switch"><span class="ns-long">Jouer </span>en ligne</a>
      <a href="/salon" class="btn-ghost sm nav-create">Créer une soirée</a>
    {/if}

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
          <a href="/collection" class="nav-dd-item">Ma collection</a>
          <a href="/settings" class="nav-dd-item">Param&egrave;tres</a>

          {#if univers === 'jeu'}
            <span class="nav-dd-group nav-dd-mobile-only">Naviguer</span>
            <a href="/cartes"      class="nav-dd-item nav-dd-mobile-only">Cartes</a>
            <a href="/docs"        class="nav-dd-item nav-dd-mobile-only">Aide et r&egrave;gles</a>
            <a href="/soutenir"    class="nav-dd-item nav-dd-mobile-only">Soutenir ZIK</a>
          {/if}

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

{#if univers === 'jeu'}
  <nav id="bottom-nav" aria-label="Navigation principale">
    <a href="/rooms" class="bottom-nav-item" class:active={activeSection === 'rooms'}>
      <svg viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
      Rooms
    </a>
    <a href="/playlists" class="bottom-nav-item" class:active={activeSection === 'playlists'}>
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 9V3M15 12h6M12 15v6M9 12H3"/></svg>
      Playlists
    </a>
    <a href="/jouer" class="bottom-nav-item bn-home" class:active={activeSection === 'jouer'} aria-label="Jouer en ligne">
      <span class="bn-home-inner">
        <svg viewBox="0 0 24 24"><polyline points="22 12 12 2 2 12"/><path d="M5 12v7a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-7"/></svg>
      </span>
    </a>
    <a href="/zikle" class="bottom-nav-item" class:active={activeSection === 'zikle'}>
      <svg viewBox="0 0 24 24"><path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11h2"/></svg>
      Zikle
    </a>
    <a href="/classements" class="bottom-nav-item" class:active={activeSection === 'classements'}>
      <svg viewBox="0 0 24 24"><path d="M8 21V11M12 21V5M16 21v-7"/></svg>
      Classements
    </a>
  </nav>
{:else if univers === 'soiree'}
  <nav id="bottom-nav" class="bn-soiree" aria-label="Navigation ZIK Soirée">
    <a href="/soiree" class="bottom-nav-item" class:active={activeSection === 'soiree'}>
      <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      Découvrir
    </a>
    <a href="/pro" class="bottom-nav-item" class:active={activeSection === 'pro'}>
      <svg viewBox="0 0 24 24"><path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>
      Tarifs
    </a>
    <a href="/salon" class="bottom-nav-item">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
      Créer
    </a>
    <a href="/soiree#faq" class="bottom-nav-item">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01"/></svg>
      Aide
    </a>
  </nav>
{/if}
