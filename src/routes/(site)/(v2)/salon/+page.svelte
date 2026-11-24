<script>
  import { getContext, onMount, untrack } from 'svelte';
  import { page } from '$app/state';
  import JsonLd from '#lib/components/ui/JsonLd.svelte';
  import PlaylistPicker from '#lib/components/salon/playlists/PlaylistPicker.svelte';
  import { rememberSignupRef } from '#lib/client/signupRef.js';
  import ProUpsell from '#lib/components/salon/setup/ProUpsell.svelte';
  import SetupHero from '#lib/components/salon/setup/SetupHero.svelte';
  import ResumeSalon from '#lib/components/salon/setup/ResumeSalon.svelte';
  import SetupBlock from '#lib/components/salon/setup/SetupBlock.svelte';
  import SetupSheet from '#lib/components/salon/setup/SetupSheet.svelte';
  import SetupPro from '#lib/components/salon/setup/SetupPro.svelte';
  import SetupBar from '#lib/components/salon/setup/SetupBar.svelte';
  import SalonSeo from '#lib/components/salon/setup/SalonSeo.svelte';
  import { SalonSetup } from '#lib/components/salon/setup/salonSetup.svelte.js';
  import { salonJsonLd } from '#lib/components/salon/setup/salonSetupSeo.js';
  import { FREE_MAX_PLAYERS, FREE_MAX_TEAMS } from '#lib/data/proPlans.js';

  const zik = getContext('zik');
  const s = new SalonSetup(zik, page.url.searchParams);
  const userId = $derived(zik.user?.id ?? null);

  onMount(() => s.restore());
  // Seuls authReady et userId relancent le chargement : l'état lu par load() ne doit pas boucler
  $effect(() => {
    const id = userId;
    if (zik.authReady) untrack(() => s.load(id));
  });

  function login(view = 'register') {
    rememberSignupRef('salon-setup');
    zik.openAuthModal(view);
  }
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

<main class="cr-page">
  <div class="cr">
    <section class="cr-tete">
      <SetupHero />
      <SetupPro user={zik.user} pro={s.pro} proRow={s.proRow} portalBusy={s.portalBusy} onPortal={() => s.openPortal()} onLogin={() => login('login')} />
    </section>

    <div class="cr-set">
      <ResumeSalon />
      <SetupBlock n="01" title="La musique" aide={s.selectedIds.length ? `${s.selectedIds.length} au programme` : ''}>
        {#if s.playlistsState === 'error'}
          <p class="cr-err" role="alert">Les playlists n'ont pas pu être chargées. <button type="button" onclick={() => s.load()}>Réessayer</button></p>
        {:else if s.playlistsState === 'loading'}
          <p class="cr-attente">Chargement des playlists…</p>
        {/if}
        <PlaylistPicker playlists={s.playlists} bind:selectedIds={s.selectedIds} onLogin={zik.user ? null : () => login()} />
      </SetupBlock>
      <SetupSheet {s} />
    </div>

    <p class="cr-tv"><b>Cet onglet deviendra l'écran TV.</b> Crée la soirée sur l'ordinateur branché à la télé : tu piloteras depuis ton téléphone.</p>
    {#if !s.pro}
      <p class="cr-gratuit">Gratuit jusqu'à {FREE_MAX_PLAYERS}&nbsp;joueurs et {FREE_MAX_TEAMS}&nbsp;équipes. <a href="/pro">Découvrir ZIK Pro</a></p>
    {/if}
  </div>

  <SetupBar
    selectedCount={s.selectedIds.length} totalTracks={s.totalTracks} maxRounds={s.maxRounds} error={s.error} creating={s.creating}
    loading={s.playlistsState === 'loading'}
    onCreate={() => s.create()}
  />
</main>

<SalonSeo />

{#if s.upsell}<ProUpsell feature={s.upsell} onClose={() => (s.upsell = null)} />{/if}

<style>
  .cr-page { padding-top: var(--top); }
  .cr {
    display: grid;
    gap: 26px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 26px 20px 30px;
  }
  .cr-tete { display: grid; gap: 14px; justify-items: start; align-content: start; }
  .cr-set { display: grid; gap: 22px; min-width: 0; }
  .cr-tv {
    padding: 16px 18px;
    border: 1px solid rgba(47, 184, 255, 0.45);
    border-radius: 18px;
    background: rgba(47, 184, 255, 0.07);
    font-size: 15px;
    line-height: 1.45;
    color: var(--soft);
  }
  .cr-tv b { font-weight: 600; color: var(--text); }
  .cr-gratuit { font-size: 15px; color: var(--muted); }
  .cr-gratuit a { font-weight: 600; color: var(--text); text-decoration-color: var(--line-2); text-underline-offset: 4px; }
  .cr-attente { font-size: 15px; color: var(--muted); }
  .cr-err { color: var(--danger); }
  .cr-err button {
    min-height: 44px;
    margin-left: 8px;
    padding: 0 16px;
    border: 1px solid currentColor;
    border-radius: 999px;
    background: none;
    color: var(--text);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  /* Un seul encart TV, replacé sous l'en-tête sur grand écran */
  @media (min-width: 900px) {
    .cr {
      grid-template-columns: 4fr 7fr;
      grid-template-rows: auto auto 1fr;
      grid-template-areas: 'tete set' 'tv set' 'gratuit set';
      column-gap: 64px;
      row-gap: 18px;
      padding: 56px 20px 64px;
    }
    .cr-tete { grid-area: tete; gap: 18px; }
    .cr-set { grid-area: set; gap: 26px; }
    .cr-tv { grid-area: tv; }
    .cr-gratuit { grid-area: gratuit; align-self: start; }
  }
</style>
