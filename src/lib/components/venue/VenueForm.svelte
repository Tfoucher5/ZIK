<script>
  import { VENUE_FIELDS } from '$lib/venues.js';

  let { admin } = $props();
  const LONG = new Set(['description']);
</script>

<form class="vf" onsubmit={(e) => { e.preventDefault(); admin.save(); }}>
  {#each Object.entries(VENUE_FIELDS) as [key, f] (key)}
    <label>
      <span>{f.label}{f.required ? ' *' : ''}</span>
      {#if LONG.has(key)}
        <textarea bind:value={admin.form[key]} maxlength={f.max} rows="4"></textarea>
      {:else}
        <input bind:value={admin.form[key]} maxlength={f.max} required={f.required}
          placeholder={key === 'schedule' ? 'Tous les mardis à 21 h' : key === 'welcome' ? 'Bienvenue au Comptoir !' : ''} />
      {/if}
    </label>
  {/each}

  <div class="vf-row">
    <label class="vf-logo">
      <span>Logo</span>
      <input type="file" accept="image/png,image/jpeg,image/webp"
        onchange={(e) => e.target.files[0] && admin.setLogo(e.target.files[0])} />
    </label>
    {#if admin.form.logo}
      <img src={admin.form.logo} alt="Aperçu du logo" />
      <button type="button" class="vf-link" onclick={() => (admin.form.logo = null)}>Retirer</button>
    {/if}
  </div>

  <div class="vf-row">
    <label class="vf-color">
      <span>Couleur sur la TV</span>
      <input type="color" bind:value={admin.form.color} />
    </label>
    {#if admin.form.color}<button type="button" class="vf-link" onclick={() => (admin.form.color = null)}>Couleur ZIK</button>{/if}
  </div>

  <button class="vf-save" disabled={admin.busy}>{admin.venue ? 'Enregistrer' : 'Créer mon lieu'}</button>
</form>

<style>
  .vf { display: flex; flex-direction: column; gap: 14px; }
  label { display: flex; flex-direction: column; gap: 6px; }
  label span { font-size: 0.8rem; font-weight: 700; color: var(--mid); }
  input:not([type="file"]):not([type="color"]), textarea {
    padding: 11px 13px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: rgb(var(--c-glass) / 0.04);
    color: var(--text);
    font: inherit;
  }
  .vf-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .vf-row img { height: 56px; max-width: 140px; object-fit: contain; }
  .vf-color input { width: 64px; height: 40px; padding: 0; border: 0; background: none; }
  .vf-link { background: none; border: 0; color: var(--mid); text-decoration: underline; cursor: pointer; font: inherit; font-size: 0.85rem; }
  .vf-save { align-self: flex-start; padding: 12px 22px; border: 0; border-radius: 3px; background: var(--accent); color: var(--on-accent); font: inherit; font-weight: 800; cursor: pointer; }
  .vf-save:disabled { opacity: 0.5; }
</style>
