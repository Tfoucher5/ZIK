<script>
  import { getContext } from 'svelte';
  import VenueForm from '$lib/components/venue/VenueForm.svelte';
  import VenueLinks from '$lib/components/venue/VenueLinks.svelte';
  import VenueEventsEditor from '$lib/components/venue/VenueEventsEditor.svelte';
  import VenueTvPreview from '$lib/components/venue/VenueTvPreview.svelte';
  import ProSpaceTabs from '$lib/components/organizer/ProSpaceTabs.svelte';
  import { VenueAdmin } from '$lib/components/venue/venueAdmin.svelte.js';

  const zik = getContext('zik');
  const admin = new VenueAdmin(zik);
</script>

<svelte:head>
  <title>Mon lieu - ZIK Pro</title>
  <meta name="robots" content="noindex" />
  <link rel="stylesheet" href="/css/venue.css?v=3.18.0" />
</svelte:head>

<main class="vn-page">
  {#if zik.user?.pro}
    <ProSpaceTabs active="venue" />
  {:else}
    <nav class="vn-crumbs" aria-label="Fil d'Ariane">
      <a href="/pro">ZIK Pro</a> › <span>Mon lieu</span>
    </nav>
  {/if}

  <header class="pl-head">
    <h1 class="vn-title">{admin.venue?.name ?? 'Mon lieu'}</h1>
    <p class="vn-lead">
      Votre page publique avec vos soirées et le classement du mois de vos habitués, votre logo et
      votre couleur sur la TV, et une affiche à imprimer.
    </p>
  </header>

  {#if zik.authReady && !zik.user}
    <div class="vn-card pl-gate">
      <h2>Connectez-vous</h2>
      <p class="vn-card-sub">Utilisez le compte de votre abonnement ZIK Pro.</p>
      <button class="vn-btn" onclick={() => zik.openAuthModal('login')}>Se connecter</button>
    </div>
  {:else if admin.ready && !admin.pro}
    <div class="vn-card pl-gate">
      <h2>La page de votre lieu fait partie de ZIK Pro</h2>
      <p class="vn-card-sub">Page publique, classement de vos habitués, logo et couleur sur la TV, affiche avec QR code.</p>
      <a class="vn-btn" href="/pro#tarifs">Voir les formules</a>
    </div>
  {:else if admin.ready}
    {#if admin.venue}<VenueLinks venue={admin.venue} />{/if}

    <div class="pl-grid">
      <div class="pl-main">
        <VenueForm {admin} />
        {#if admin.venue}
          <section class="vn-card pl-events" id="soirees">
            <div class="vn-card-head">
              <h2>Prochaines soirées</h2>
              <span class="vn-card-sub">{admin.events.length} / 12</span>
            </div>
            <VenueEventsEditor {admin} />
          </section>
        {/if}
      </div>

      <aside class="pl-side">
        <p class="pl-side-label">Aperçu de la TV</p>
        <VenueTvPreview form={admin.form} />
        <p class="vn-card-sub">Ce que voient vos clients en arrivant. L'aperçu suit vos modifications.</p>
      </aside>
    </div>
  {:else}
    <div class="pl-loading" aria-label="Chargement"></div>
  {/if}

  {#if admin.message || admin.error}
    <p class="pl-toast" class:err={!!admin.error} role="status">{admin.error || admin.message}</p>
  {/if}
</main>

<style>
  .pl-head { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; margin-bottom: 32px; }
  .pl-gate { max-width: 560px; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
  .pl-grid { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 28px; align-items: start; }
  .pl-main { display: flex; flex-direction: column; gap: 20px; }
  .pl-events { scroll-margin-top: calc(var(--nav-h) + 16px); }
  .pl-side { position: sticky; top: calc(var(--nav-h) + 20px); display: flex; flex-direction: column; gap: 12px; }
  .pl-side-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--mid); }
  .pl-loading { height: 320px; border-radius: 16px; background: var(--surface); animation: pl-pulse 1.2s ease-in-out infinite alternate; }
  @keyframes pl-pulse { to { opacity: 0.5; } }
  .pl-toast {
    position: fixed;
    left: 50%;
    top: calc(var(--nav-h) + 16px);
    z-index: 50;
    transform: translateX(-50%);
    padding: 12px 18px;
    border-radius: 12px;
    background: var(--success);
    color: #000;
    font-weight: 700;
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.25);
  }
  .pl-toast.err { background: var(--danger); color: #fff; }
  @media (max-width: 960px) {
    .pl-grid { grid-template-columns: 1fr; }
    .pl-side { position: static; order: -1; }
  }
</style>
