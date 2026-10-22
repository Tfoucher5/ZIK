<script>
  import { getContext } from 'svelte';
  import VenueForm from '$lib/components/venue/VenueForm.svelte';
  import VenueLinks from '$lib/components/venue/VenueLinks.svelte';
  import VenueTvPreview from '$lib/components/venue/VenueTvPreview.svelte';
  import ProSpaceShell from '$lib/components/organizer/ProSpaceShell.svelte';
  import { VenueAdmin } from '$lib/components/venue/venueAdmin.svelte.js';

  const admin = new VenueAdmin(getContext('zik'));
</script>

<ProSpaceShell {admin} active="venue" title={admin.venue?.name ?? 'Mon lieu'}
  lead="Les informations de votre page publique, votre logo, votre couleur et votre message sur la TV, et une affiche à imprimer.">
  {#if admin.venue}<VenueLinks venue={admin.venue} />{/if}

  <div class="pl-grid">
    <VenueForm {admin} />

    <aside class="pl-side">
      <p class="pl-side-label">Aperçu de la TV</p>
      <VenueTvPreview form={admin.form} />
      <p class="vn-card-sub">Ce que voient vos clients en arrivant. L'aperçu suit vos modifications.</p>
      {#if admin.venue}
        <a class="vn-card pl-next" href="/pro/soirees">
          <b>Vos soirées →</b>
          <span>Programmez vos dates et prévenez ceux qui suivent votre lieu.</span>
        </a>
      {/if}
    </aside>
  </div>
</ProSpaceShell>

<style>
  .pl-grid { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 28px; align-items: start; }
  .pl-side { position: sticky; top: calc(var(--nav-h) + 20px); display: flex; flex-direction: column; gap: 12px; }
  .pl-side-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--mid); }
  .pl-next { display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; margin-top: 8px; color: var(--text); text-decoration: none; }
  .pl-next:hover { border-color: var(--accent); }
  .pl-next span { font-size: 0.82rem; color: var(--mid); }
  @media (max-width: 960px) {
    .pl-grid { grid-template-columns: 1fr; }
    .pl-side { position: static; order: -1; }
    .pl-next { display: none; }
  }
</style>
