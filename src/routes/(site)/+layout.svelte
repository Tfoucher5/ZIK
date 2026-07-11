<script>
  import { onMount, setContext } from 'svelte';
  import { page } from '$app/state';
  import Nav from '$lib/components/Nav.svelte';
  import AuthModal from '$lib/components/AuthModal.svelte';
  import AnnouncementPopup from '$lib/components/AnnouncementPopup.svelte';
  import ContactModal from '$lib/components/ContactModal.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import { createSupabaseClient } from '$lib/supabase.js';
  import { initNotifications, teardownNotifications } from '$lib/notifications.svelte.js';
  import { ADSENSE_CLIENT } from '$lib/ads.js';

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
    initNotifications(sb);
  }

  function openAuthModal(view = 'login') {
    authView = view;
    authOpen = true;
  }

  let adsLoaded = false;
  function loadAdsScript() {
    if (adsLoaded || currentUser?.profile?.role === 'super_admin') return;
    adsLoaded = true;
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(s);
  }

  onMount(async () => {
    if (!sb) { authReady = true; loadAdsScript(); return; }
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) await applyUser(session.user);
    } catch {
      /* session fetch failed — still mark auth as ready */
    }

    authReady = true;
    loadAdsScript();
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await applyUser(session.user);
        authOpen = false;
      } else if (event === 'SIGNED_OUT') {
        clearCachedProfile(currentUser?.id);
        currentUser = null;
        sessionStorage.removeItem('zik_uid');
        sessionStorage.removeItem('zik_uname');
        teardownNotifications();
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

  <link rel="stylesheet" href="/css/base.css?v=3.0.0">
  <link rel="stylesheet" href="/css/animations.css?v=3.0.0">
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
      <a href="https://discord.gg/Xkr9aUEKYf" class="btn-discord" target="_blank" rel="noopener">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" fill="white" d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942.0209-.0406.0098-.0895-.0321-.1112a13.201 13.201 0 0 1-1.8735-.8914.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
        Rejoindre le Discord
      </a>
      <span class="footer-discord-text">Feedback, bugs, discussions</span>
    </div>
  </div>

  <div class="footer-bottom">
    <span class="footer-copy">© 2026 ZIK · par <a href="/portfolio">Theo Foucher</a></span>
    <span class="footer-version-tag">v3.0.0</span>
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
