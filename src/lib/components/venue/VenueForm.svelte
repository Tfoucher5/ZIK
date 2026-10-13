<script>
  import VenueBranding from './VenueBranding.svelte';
  import { VENUE_FIELDS } from '$lib/venues.js';

  let { admin } = $props();

  const HINTS = {
    website: { placeholder: 'www.lecomptoir.fr' },
    schedule: { placeholder: 'Tous les mardis à 21 h', hint: 'Votre rendez-vous régulier, en tête de page et sur l\'affiche.' },
    description: { placeholder: 'Ambiance, lots à gagner, réservation conseillée…' },
  };
</script>

{#snippet field(key)}
  {@const f = VENUE_FIELDS[key]}
  <label class="vn-field">
    <span>{f.label}{f.required ? ' *' : ''}</span>
    {#if key === 'description'}
      <textarea class="vn-input" bind:value={admin.form[key]} maxlength={f.max} rows="4" placeholder={HINTS[key].placeholder}></textarea>
    {:else}
      <input class="vn-input" bind:value={admin.form[key]} maxlength={f.max} required={f.required} placeholder={HINTS[key]?.placeholder ?? ''} />
    {/if}
    {#if HINTS[key]?.hint}<small>{HINTS[key].hint}</small>{/if}
  </label>
{/snippet}

<form class="vf" onsubmit={(e) => { e.preventDefault(); admin.save(); }}>
  <section class="vn-card">
    <div class="vn-card-head">
      <h2>Le lieu</h2>
      <span class="vn-card-sub">Affiché sur votre page et dans « Où jouer », classé par ville</span>
    </div>
    <div class="vf-grid">
      {@render field('name')}
      {@render field('city')}
      {@render field('address')}
      {@render field('website')}
    </div>
  </section>

  <section class="vn-card">
    <div class="vn-card-head">
      <h2>Sur la TV</h2>
      <span class="vn-card-sub">Dans chaque salon lancé avec ce compte</span>
    </div>
    <VenueBranding {admin} />
  </section>

  <section class="vn-card">
    <div class="vn-card-head">
      <h2>Page publique</h2>
      <span class="vn-card-sub">Ce que lisent vos clients avant de venir</span>
    </div>
    <div class="vf-stack">
      {@render field('schedule')}
      {@render field('description')}
    </div>
  </section>

  <div class="vf-bar" class:dirty={admin.dirty}>
    <span>{admin.dirty ? 'Modifications non enregistrées' : 'Tout est enregistré'}</span>
    <button class="vn-btn" disabled={admin.busy || !admin.dirty}>{admin.venue ? 'Enregistrer' : 'Créer ma page'}</button>
  </div>
</form>

<style>
  .vf { display: flex; flex-direction: column; gap: 20px; }
  .vf-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .vf-stack { display: flex; flex-direction: column; gap: 16px; }
  .vf-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 12px 12px 12px 20px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--nav-bg);
    backdrop-filter: blur(10px);
    font-size: 0.85rem;
    color: var(--dim);
  }
  .vf-bar.dirty { position: sticky; bottom: 16px; z-index: 2; border-color: rgb(var(--accent-rgb) / 0.5); color: var(--text); font-weight: 700; }
  @media (max-width: 600px) {
    .vf-grid { grid-template-columns: 1fr; }
  }
</style>
