<script>
  import JsonLd from '$lib/components/ui/JsonLd.svelte';
  import { onMount } from 'svelte';
  import { createSupabaseClient } from '$lib/client/supabase.js';
  import AuthModal from '$lib/components/auth/AuthModal.svelte';
  import PlaylistPicker from '$lib/components/salon/playlists/PlaylistPicker.svelte';
  import { loadSalonPlaylists, DEFAULT_SALON_PLAYLIST } from '$lib/data/salonPlaylists.js';
  import { rememberSignupRef, tagNewUser } from '$lib/client/signupRef.js';
  import { saveSalonKey, fetchPro, proActive, goToStripe } from '$lib/client/salonClient.js';
  import ProUpsell from '$lib/components/salon/setup/ProUpsell.svelte';
  import SetupHero from '$lib/components/salon/setup/SetupHero.svelte';
  import SetupBlock from '$lib/components/salon/setup/SetupBlock.svelte';
  import SetupSheet from '$lib/components/salon/setup/SetupSheet.svelte';
  import SetupPro from '$lib/components/salon/setup/SetupPro.svelte';
  import SetupBar from '$lib/components/salon/setup/SetupBar.svelte';
  import SalonSeo from '$lib/components/salon/setup/SalonSeo.svelte';
  import { salonJsonLd } from '$lib/components/salon/setup/salonSetupSeo.js';
  import { FREE_MAX_PLAYERS, FREE_MAX_TEAMS } from '$lib/data/proPlans.js';

  let { data } = $props();

  const sb = createSupabaseClient(data.env.supabaseUrl, data.env.supabaseAnonKey);

  let user      = $state(null);
  let authReady = $state(false);
  let authOpen  = $state(false);
  let authView  = $state('login');

  let maxRounds          = $state(10);
  let roundDuration      = $state(30);
  let answerMode         = $state('free');
  let manualNext         = $state(false);
  let showAnswerDuration = $state(7);
  let teamCount          = $state(0);
  let proRow             = $state(null);
  const pro              = $derived(proActive(proRow));
  let portalBusy         = $state(false);
  let upsell             = $state(null);

  let allPlaylists = $state([]);
  let selectedIds  = $state([]);
  let autoPicked   = $state(false);
  let creating     = $state(false);
  let error        = $state('');

  let totalTrackCount = $derived(
    allPlaylists
      .filter(p => selectedIds.includes(p.id))
      .reduce((s, p) => s + (p.trackCount || 0), 0)
  );

  function openAuth(view) {
    rememberSignupRef('salon-setup');
    authView = view;
    authOpen = true;
  }

  async function openPortal() {
    portalBusy = true;
    try { await goToStripe(sb, '/api/pro/portal'); }
    catch (e) { error = e.message; portalBusy = false; }
  }

  function pickTeams(n) {
    if (!pro && n > FREE_MAX_TEAMS) upsell = 'teams';
    else teamCount = n;
  }

  async function loadPlaylists() {
    fetchPro(sb, user?.id).then((r) => (proRow = r)).catch(() => {});
    try {
      const flat = await loadSalonPlaylists(sb, user?.id ?? null);
      allPlaylists = flat;
      // ?playlist=id1,id2 : lien depuis une page /blind-test/<thème>
      const wanted = (new URLSearchParams(window.location.search).get('playlist') ?? '')
        .split(',')
        .filter((id) => flat.some((p) => p.id === id));
      if (wanted.length) selectedIds = wanted;
      else if (selectedIds.length === 0 && flat.length > 0) {
        selectedIds = [flat.find(p => p.id === DEFAULT_SALON_PLAYLIST)?.id ?? flat[0].id];
        autoPicked = true;
      }
    } catch {
      error = 'Impossible de charger les playlists.';
    }
  }

  async function createSalon() {
    error = '';
    if (selectedIds.length === 0) { error = 'Choisis au moins une playlist.'; return; }
    creating = true;
    try {
      const { data: { session } } = await sb.auth.getSession();
      const headers = { 'content-type': 'application/json' };
      if (session) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch('/api/salon', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          origin: new URLSearchParams(window.location.search).get('ref'),
          playlistIds: selectedIds,
          settings: { maxRounds, roundDuration, answerMode, manualNext, showAnswerDuration, teamCount },
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erreur création salon');
      saveSalonKey(d.code, d.key);
      window.location.href = `/salon/host?code=${d.code}`;
    } catch (e) {
      error = e.message;
      creating = false;
    }
  }

  onMount(async () => {
    if (!sb) return;
    const { data: { session } } = await sb.auth.getSession();
    user = session?.user ?? null;
    authReady = true;
    loadPlaylists();

    sb.auth.onAuthStateChange((event, session) => {
      user = session?.user ?? null;
      if (event === 'SIGNED_IN' && user) setTimeout(() => tagNewUser(sb, user));
      loadPlaylists();
    });
  });
</script>

<svelte:head>
  <title>Blind test en soirée sur la TV, les téléphones en buzzers - gratuit | ZIK</title>
  <meta name="description" content="Organisez un blind test en soirée en 2 minutes : la TV diffuse la musique et le classement, chacun répond sur son téléphone, en solo ou en équipes. Sans appli, gratuit jusqu'à {FREE_MAX_PLAYERS} joueurs." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/salon" />

  <meta property="og:title" content="Blind test en soirée sur la TV | ZIK" />
  <meta property="og:description" content="La TV diffuse, les téléphones répondent. Équipes, classement en direct, podium. Vos playlists Deezer. Sans appli, gratuit jusqu'à {FREE_MAX_PLAYERS} joueurs." />
  <meta property="og:url" content="https://www.zik-music.fr/salon" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Blind test en soirée sur la TV | ZIK" />
  <meta name="twitter:description" content="La TV diffuse, les téléphones répondent. En équipes, avec vos playlists. Sans appli, gratuit jusqu'à {FREE_MAX_PLAYERS} joueurs." />
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />

  <JsonLd json={salonJsonLd} />
</svelte:head>

<div class="st">
  <SetupHero />

  {#if !authReady}
    <p class="st-loading">Chargement…</p>
  {:else}
    <SetupBlock letter="A" title="La musique">
      <div><PlaylistPicker playlists={allPlaylists} bind:selectedIds bind:autoPicked onLogin={user ? null : () => openAuth('register')} /></div>
    </SetupBlock>

    <SetupBlock letter="B" title="Le déroulé">
      <SetupSheet
        bind:maxRounds bind:roundDuration bind:answerMode bind:manualNext bind:showAnswerDuration
        {teamCount} {pro} onPickTeams={pickTeams}
      />
    </SetupBlock>

    <SetupPro {pro} {proRow} {portalBusy} onPortal={openPortal} />
  {/if}

  <SalonSeo />
</div>

{#if authReady}
  <SetupBar
    selectedCount={selectedIds.length} {totalTrackCount} {maxRounds} {error} {creating}
    onCreate={createSalon}
  />
{/if}

{#if upsell}<ProUpsell feature={upsell} onClose={() => (upsell = null)} />{/if}

<AuthModal {sb} open={authOpen} bind:view={authView} onClose={() => (authOpen = false)} onSuccess={() => (authOpen = false)} />

<style>
  .st {
    max-width: 1040px;
    margin: 0 auto;
    padding: 22px 24px 140px;
  }

  .st-loading { padding: 40px 0; color: var(--mid); }

  @media (max-width: 760px) {
    .st { padding: 16px 16px 150px; }
  }
</style>
