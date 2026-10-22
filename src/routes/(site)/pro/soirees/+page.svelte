<script>
  import { getContext } from 'svelte';
  import VenueEventsEditor from '$lib/components/venue/VenueEventsEditor.svelte';
  import ProSpaceShell from '$lib/components/organizer/ProSpaceShell.svelte';
  import { VenueAdmin } from '$lib/components/venue/venueAdmin.svelte.js';

  const admin = new VenueAdmin(getContext('zik'));
</script>

<ProSpaceShell {admin} active="events" title="Mes soirées"
  lead="Vos prochaines dates s'affichent sur votre page publique et dans Google. Ceux qui suivent votre lieu peuvent être prévenus de chacune.">
  {#if admin.venue}
    <section class="vn-card ev-card">
      <div class="vn-card-head">
        <h2>Prochaines soirées</h2>
        <span class="vn-card-sub">{admin.events.length} / 12</span>
      </div>
      <VenueEventsEditor {admin} />
    </section>
  {:else}
    <div class="vn-card ev-card">
      <h2>Créez d'abord la page de votre lieu</h2>
      <p class="vn-card-sub">Vos soirées s'affichent dessus. Nom et ville suffisent pour commencer.</p>
      <a class="vn-btn" href="/pro/lieu">Créer ma page</a>
    </div>
  {/if}
</ProSpaceShell>

<style>
  .ev-card { max-width: 760px; display: flex; flex-direction: column; gap: 4px; align-items: stretch; }
  .ev-card .vn-btn { align-self: flex-start; margin-top: 10px; }
</style>
