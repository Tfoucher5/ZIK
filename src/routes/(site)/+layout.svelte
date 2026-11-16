<script>
  import { version } from '$app/environment';
  import { onMount, setContext } from 'svelte';
  import { page } from '$app/state';
  import Nav from '$lib/components/layout/Nav.svelte';
  import AuthModal from '$lib/components/auth/AuthModal.svelte';
  import ContactModal from '$lib/components/layout/ContactModal.svelte';
  import SiteFooter from '$lib/components/layout/SiteFooter.svelte';
  import FooterV2 from '$lib/components/layout/FooterV2.svelte';
  import Toast from '$lib/components/ui/Toast.svelte';
  import Onboarding from '$lib/components/onboarding/Onboarding.svelte';
  import { onboarding, shouldAutoStart } from '$lib/components/onboarding/onboarding.svelte.js';
  import { createSupabaseClient } from '$lib/client/supabase.js';
  import { initNotifications, teardownNotifications } from '$lib/client/notifications.svelte.js';
  import { initPush, forgetPushOwner } from '$lib/client/push.svelte.js';
  import { notifPrefs } from '$lib/components/notify/notifPrefs.svelte.js';
  import { rememberSignupRef, tagNewUser } from '$lib/client/signupRef.js';
  import { watchClientErrors } from '$lib/shared/reports/context.js';

  const isGame = $derived(page.url.pathname.startsWith('/game'));
  const isV2 = $derived(!!page.data.v2);

  let { data, children } = $props();

  // svelte-ignore state_referenced_locally
  const { supabaseUrl, supabaseAnonKey, spotifyClientId } = data.env;
  const sb = createSupabaseClient(supabaseUrl, supabaseAnonKey);

  let currentUser = $state(null);
  let authReady   = $state(false);
  let authOpen     = $state(false);
  let authView     = $state('login');
  let authOpts     = $state({});
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
    initPush(async () => (await sb.auth.getSession())?.data?.session?.access_token).catch(() => {});
  }

  // opts : next (page où revenir), note (« Ensuite : … »), onRegistered(email)
  function openAuthModal(view = 'login', opts = {}) {
    authView = view;
    authOpts = opts;
    authOpen = true;
  }

  onMount(async () => {
    watchClientErrors();
    if (!sb) { authReady = true; return; }
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) await applyUser(session.user);
    } catch {
      /* session fetch failed — still mark auth as ready */
    }

    authReady = true;
    // ?auth=register&ref=… : lien « Créer un compte » de fin de partie invité
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get('auth');
    if (!currentUser && (wanted === 'register' || wanted === 'login')) {
      if (params.get('ref')) rememberSignupRef(params.get('ref'));
      openAuthModal(wanted);
    } else if (shouldAutoStart(window.location.pathname)) {
      onboarding.start();
    }
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await applyUser(session.user);
        authOpen = false;
        setTimeout(() => tagNewUser(sb, session.user));
      } else if (event === 'SIGNED_OUT') {
        clearCachedProfile(currentUser?.id);
        currentUser = null;
        sessionStorage.removeItem('zik_uid');
        sessionStorage.removeItem('zik_uname');
        teardownNotifications();
        notifPrefs.reset();
        forgetPushOwner().catch(() => {});
      }
    });
  });
</script>

<svelte:head>
  <!-- Pas de meta description ici : chaque page en définit une dans son propre
       svelte:head. Svelte n'écrase pas celle du layout, il l'ajoute en plus —
       avoir les deux dupliquait la description sur toutes les pages. -->
  <meta name="keywords" content="blind test, blind test en ligne, blind test gratuit, blind test multijoueur, quiz musical en ligne, jeu de musique, deviner les chansons, jeu musique gratuit, blind test kahoot, blind test soirée, blind test deezer, jeu blind test, musique en ligne">
  <meta name="author" content="ZIK">
  <meta name="theme-color" content="#7c3aed">
  <meta name="format-detection" content="telephone=no">

  <!-- Open Graph. data-default : retirée côté serveur si la page définit la même
       balise (dropOverriddenMeta dans hooks.server.js), sinon les aperçus de
       liens prennent la première, la générique. -->

  <meta data-default property="og:site_name" content="ZIK">
  <meta data-default property="og:type" content="website">
  <meta data-default property="og:locale" content="fr_FR">
  <meta data-default property="og:title" content="ZIK - Blind Test Multijoueur en Ligne Gratuit">
  <meta data-default property="og:description" content="Blind test multijoueur gratuit en ligne. Import Deezer, classement ELO, ZIK Soirée sur la TV. Joue maintenant sans inscription.">
  <meta data-default property="og:url" content="https://www.zik-music.fr/">
  <meta data-default property="og:image" content="https://www.zik-music.fr/og.png?v=3.12.0">
  <meta data-default property="og:image:width" content="1200">
  <meta data-default property="og:image:height" content="630">
  <meta data-default property="og:image:alt" content="ZIK — Blind Test Multijoueur">

  <!-- Twitter Card -->
  <meta data-default name="twitter:card" content="summary_large_image">
  <meta data-default name="twitter:title" content="ZIK - Blind Test Multijoueur en Ligne Gratuit">
  <meta data-default name="twitter:description" content="Blind test multijoueur gratuit. Importe tes playlists Deezer, grimpe dans le classement ELO. Sans installation.">
  <meta data-default name="twitter:image" content="https://www.zik-music.fr/og.png?v=3.12.0">

  {#each ["nav", "nav-menus", "bottom-nav", "controls", "footer", "auth-modal"] as f (f)}<link rel="stylesheet" href="/css/base/{f}.css?v={version}">{/each}
  <link rel="stylesheet" href="/css/animations.css?v={version}">
  <link rel="stylesheet" href="/css/cards.css?v={version}">
</svelte:head>

{#if !isGame && !isV2}
<Nav
  user={currentUser}
  onLogin={() => openAuthModal('login')}
  onRegister={() => openAuthModal('register')}
  onLogout={() => sb?.auth.signOut()}
/>
{/if}


{@render children()}

<Toast />

{#if !isGame}<Onboarding />{/if}

{#if isV2}
<FooterV2 onContact={() => contactOpen = true} />
{:else if !isGame}
<SiteFooter onContact={() => contactOpen = true} />
{/if}

<AuthModal
  {sb}
  bind:open={authOpen}
  bind:view={authView}
  next={authOpts.next}
  note={authOpts.note}
  onRegistered={authOpts.onRegistered}
  onClose={() => { authOpen = false; }}
/>

<ContactModal bind:open={contactOpen} userId={currentUser?.id ?? null} />
