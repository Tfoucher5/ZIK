<script>
  import { onMount, setContext } from 'svelte';
  import { page } from '$app/state';
  import Nav from '$lib/components/Nav.svelte';
  import AuthModal from '$lib/components/AuthModal.svelte';
  import AnnouncementPopup from '$lib/components/AnnouncementPopup.svelte';
  import ContactModal from '$lib/components/ContactModal.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import { createSupabaseClient } from '$lib/supabase.js';

  const isGame = $derived(page.url.pathname.startsWith('/game'));

  let { data, children } = $props();

  // svelte-ignore state_referenced_locally
  const { supabaseUrl, supabaseAnonKey, spotifyClientId } = data.env;
  const sb = createSupabaseClient(supabaseUrl, supabaseAnonKey);

  let currentUser = $state(null);
  let authReady   = $state(false);
  let authOpen     = $state(false);
  let authView     = $state('login');
  let contactOpen  = $state(false);

  setContext('zik', {
    get sb()          { return sb; },
    get user()        { return currentUser; },
    get authReady()   { return authReady; },
    openAuthModal,
    get spotifyClientId() { return spotifyClientId; },
  });

  const PROFILE_TTL = 5 * 60 * 1000;
  function getCachedProfile(uid) {
    try {
      const raw = sessionStorage.getItem('zik_profile_' + uid);
      if (!raw) return null;
      const { p, ts } = JSON.parse(raw);
      if (Date.now() - ts > PROFILE_TTL) { sessionStorage.removeItem('zik_profile_' + uid); return null; }
      return p;
    } catch { return null; }
  }
  function setCachedProfile(uid, profile) {
    try { sessionStorage.setItem('zik_profile_' + uid, JSON.stringify({ p: profile, ts: Date.now() })); } catch { /* sessionStorage unavailable */ }
  }
  function clearCachedProfile(uid) {
    try { if (uid) sessionStorage.removeItem('zik_profile_' + uid); } catch { /* sessionStorage unavailable */ }
  }

  async function applyUser(user) {
    try {
      let profile = getCachedProfile(user.id);
      if (!profile) {
        const { data: d } = await sb.from('profiles').select('*').eq('id', user.id).single();
        profile = d;
        if (profile) setCachedProfile(user.id, profile);
      }
      currentUser = { ...user, profile };
      sessionStorage.setItem('zik_uid',   user.id);
      sessionStorage.setItem('zik_uname', profile?.username || user.email?.split('@')[0] || 'Joueur');
    } catch {
      currentUser = { ...user, profile: null };
      sessionStorage.setItem('zik_uid',   user.id);
      sessionStorage.setItem('zik_uname', user.email?.split('@')[0] || 'Joueur');
    }
  }

  function openAuthModal(view = 'login') {
    authView = view;
    authOpen = true;
  }

  onMount(async () => {
    if (!sb) { authReady = true; return; }
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) await applyUser(session.user);
    } catch {
      /* session fetch failed — still mark auth as ready */
    }

    authReady = true;
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await applyUser(session.user);
        authOpen = false;
      } else if (event === 'SIGNED_OUT') {
        clearCachedProfile(currentUser?.id);
        currentUser = null;
        sessionStorage.removeItem('zik_uid');
        sessionStorage.removeItem('zik_uname');
      }
    });
  });
</script>

<svelte:head>
  <meta name="description" content="ZIK — Blind test musical multijoueur en ligne. Rejoins une room, trouve les titres avant tout le monde et grimpe dans le classement ELO. Gratuit, sans téléchargement.">
  <meta name="keywords" content="blind test, blind test en ligne, blind test gratuit, blind test multijoueur, quiz musical en ligne, jeu de musique, deviner les chansons, jeu musique gratuit, blind test kahoot, blind test soirée, blind test spotify, blind test deezer, jeu blind test, musique en ligne">
  <meta name="author" content="ZIK">
  <meta name="theme-color" content="#7c3aed">
  <meta name="format-detection" content="telephone=no">

  <!-- Open Graph -->
  <meta property="og:site_name" content="ZIK">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:title" content="ZIK — Blind Test Multijoueur en Ligne Gratuit">
  <meta property="og:description" content="Blind test multijoueur gratuit en ligne. Spotify & Deezer, classement ELO, Mode Salon. Joue maintenant sans inscription.">
  <meta property="og:url" content="https://www.zik-music.fr/">
  <meta property="og:image" content="https://www.zik-music.fr/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="ZIK — Blind Test Multijoueur">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="ZIK — Blind Test Multijoueur en Ligne Gratuit">
  <meta name="twitter:description" content="Blind test multijoueur gratuit. Importe tes playlists Spotify/Deezer, grimpe dans le classement ELO. Sans installation.">
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png">

  <link rel="stylesheet" href="/css/base.css?v=2.1.1">
  <link rel="stylesheet" href="/css/animations.css?v=2.1.1">
</svelte:head>

{#if !isGame}
<Nav
  user={currentUser}
  onLogin={() => openAuthModal('login')}
  onRegister={() => openAuthModal('register')}
  onLogout={() => sb?.auth.signOut()}
/>
{/if}

<AnnouncementPopup {sb} />

{@render children()}

<Toast />

{#if !isGame}
<footer class="site-footer">
  <div class="footer-stripe"></div>

  <div class="footer-masthead">
    <a href="/" class="footer-logo">ZIK<span>.</span></a>
    <div class="footer-mast-divider"></div>
    <div class="footer-mast-info">
      <span class="footer-mast-label">Édition en ligne</span>
      <span class="footer-mast-tagline">Blind Test Multijoueur</span>
      <div class="footer-mast-online">
        <span class="footer-online-dot"></span>
        zik-music.fr · en ligne
      </div>
    </div>
  </div>

  <div class="footer-columns">
    <div class="footer-col">
      <span class="footer-col-head">Jouer</span>
      <div class="footer-col-links">
        <a href="/rooms">Rooms</a>
        <a href="/playlists">Playlists</a>
        <a href="/classements">Classements</a>
        <a href="/salon">Mode Salon</a>
        <a href="/docs">Documentation</a>
        <a href="/nouveautes">Nouveautés</a>
      </div>
    </div>

    <div class="footer-col">
      <span class="footer-col-head">Compte</span>
      <div class="footer-col-links">
        <a href="/profile">Mon profil</a>
        <a href="/settings">Paramètres</a>
      </div>
    </div>

    <div class="footer-col">
      <span class="footer-col-head">Légal</span>
      <div class="footer-col-links">
        <a href="/cgu">CGU</a>
        <a href="/confidentialite">Confidentialité</a>
        <a href="/mentions-legales">Mentions légales</a>
        <button class="footer-contact-btn" onclick={() => contactOpen = true}>Contact</button>
      </div>
    </div>

    <div class="footer-col">
      <span class="footer-col-head">Comparer</span>
      <div class="footer-col-links">
        <a href="/vs/kahoot">ZIK vs Kahoot</a>
        <a href="/vs/blinest">ZIK vs Blinest</a>
        <a href="/vs/blindtest-io">ZIK vs Blindtest.io</a>
      </div>
    </div>

    <div class="footer-col footer-discord-col">
      <a href="https://discord.gg/zik" class="btn-discord" target="_blank" rel="noopener">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.045.03.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
        Rejoindre le Discord
      </a>
      <span class="footer-discord-text">Feedback, bugs, discussions</span>
    </div>
  </div>

  <div class="footer-bottom">
    <span class="footer-copy">© 2026 ZIK · par <a href="/portfolio">Theo Foucher</a></span>
    <span class="footer-version-tag">v2.10.0</span>
  </div>
</footer>
{/if}

<AuthModal
  {sb}
  bind:open={authOpen}
  bind:view={authView}
  onClose={() => { authOpen = false; }}
/>

<ContactModal bind:open={contactOpen} />
