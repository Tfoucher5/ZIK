<script>
  import { getContext } from 'svelte';
  import VenueForm from '$lib/components/venue/VenueForm.svelte';
  import VenueEventsEditor from '$lib/components/venue/VenueEventsEditor.svelte';
  import { VenueAdmin } from '$lib/components/venue/venueAdmin.svelte.js';

  const zik = getContext('zik');
  const admin = new VenueAdmin(zik);
</script>

<svelte:head>
  <title>Mon lieu - ZIK Pro</title>
  <meta name="robots" content="noindex" />
  <link rel="stylesheet" href="/css/blind-test.css?v=3.18.0" />
</svelte:head>

<main class="bt-page">
  <nav class="bt-crumbs" aria-label="Fil d'Ariane">
    <a href="/">Accueil</a> › <a href="/pro">ZIK Pro</a> › <span>Mon lieu</span>
  </nav>

  <header class="bt-header">
    <h1><span class="bt-kicker">ZIK Pro</span>Mon lieu</h1>
    <p class="bt-intro">
      Votre page publique avec vos prochaines soirées et le classement du mois de vos habitués, votre
      logo et votre couleur sur la TV, et une affiche à imprimer. Mettez le lien de votre page sur votre
      site, votre Facebook et votre fiche Google : vos clients y retrouvent les dates et leur classement.
    </p>
  </header>

  {#if zik.authReady && !zik.user}
    <section class="bt-section">
      <p>Connectez-vous avec le compte de votre abonnement ZIK Pro.</p>
      <button class="ml-btn" onclick={() => zik.openAuthModal('login')}>Se connecter</button>
    </section>
  {:else if admin.ready && !admin.pro}
    <section class="bt-section">
      <p>La page de votre lieu fait partie de ZIK Pro.</p>
      <a class="ml-btn" href="/pro#tarifs">Voir les formules</a>
    </section>
  {:else if admin.ready}
    {#if admin.venue}
      <section class="bt-section">
        <h2>Vos liens</h2>
        <ul class="bt-others">
          <li><a href="/lieu/{admin.venue.slug}">Page publique : zik-music.fr/lieu/{admin.venue.slug}</a></li>
          <li><a href="/lieu/{admin.venue.slug}/affiche">Affiche à imprimer avec QR code</a></li>
        </ul>
        <p class="bt-pro">Le logo, la couleur et le message s'affichent sur la TV dans chaque salon lancé avec ce compte.</p>
      </section>
    {/if}

    <section class="bt-section">
      <h2>Informations</h2>
      <VenueForm {admin} />
    </section>

    {#if admin.venue}
      <section class="bt-section">
        <h2>Prochaines soirées</h2>
        <VenueEventsEditor {admin} />
      </section>
    {/if}

    {#if admin.message || admin.error}
      <p class="ml-toast" class:err={!!admin.error} role="status">{admin.error || admin.message}</p>
    {/if}
  {/if}
</main>

<style>
  .ml-btn { display: inline-block; margin-top: 12px; padding: 12px 22px; border: 0; border-radius: 3px; background: var(--accent); color: var(--on-accent); font: inherit; font-weight: 800; text-decoration: none; cursor: pointer; }
  .ml-toast { position: sticky; bottom: 16px; padding: 12px 16px; border-radius: 3px; background: var(--success); color: #000; font-weight: 700; }
  .ml-toast.err { background: var(--danger); color: #fff; }
</style>
