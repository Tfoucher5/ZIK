<script>
  import { VENUE_FIELDS } from '$lib/venues.js';

  let { admin } = $props();
  let dragging = $state(false);

  const SWATCHES = ['#e11d48', '#f97316', '#eab308', '#16a34a', '#0ea5e9', '#4f46e5', '#111827'];

  function drop(e) {
    e.preventDefault();
    dragging = false;
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) admin.setLogo(file);
  }
</script>

<div class="vb">
  <div class="vn-field">
    <span>Logo</span>
    <label class="vb-drop" class:on={dragging} class:has={admin.form.logo}
      ondragover={(e) => { e.preventDefault(); dragging = true; }} ondragleave={() => (dragging = false)} ondrop={drop}>
      <input type="file" accept="image/png,image/jpeg,image/webp"
        onchange={(e) => e.target.files[0] && admin.setLogo(e.target.files[0])} />
      {#if admin.form.logo}
        <img src={admin.form.logo} alt="Votre logo" />
        <span>Changer le logo</span>
      {:else}
        <b>Déposez votre logo ici</b>
        <span>ou cliquez pour choisir · PNG, JPG ou WebP, fond transparent conseillé</span>
      {/if}
    </label>
    {#if admin.form.logo}<button type="button" class="vb-link" onclick={() => (admin.form.logo = null)}>Retirer le logo</button>{/if}
  </div>

  <div class="vn-field">
    <span>Couleur</span>
    <div class="vb-colors" role="radiogroup" aria-label="Couleur du lieu">
      <button type="button" class="vb-sw vb-zik" class:sel={!admin.form.color} onclick={() => (admin.form.color = null)}
        role="radio" aria-checked={!admin.form.color} title="Couleur ZIK">ZIK</button>
      {#each SWATCHES as c (c)}
        <button type="button" class="vb-sw" class:sel={admin.form.color === c} style="background:{c}"
          onclick={() => (admin.form.color = c)} role="radio" aria-checked={admin.form.color === c} aria-label={c}></button>
      {/each}
      <label class="vb-sw vb-custom" class:sel={admin.form.color && !SWATCHES.includes(admin.form.color)} title="Autre couleur">
        <input type="color" value={admin.form.color || '#ff00ff'} oninput={(e) => (admin.form.color = e.target.value)} />
      </label>
    </div>
  </div>

  <label class="vn-field">
    <span>{VENUE_FIELDS.welcome.label}</span>
    <input class="vn-input" bind:value={admin.form.welcome} maxlength={VENUE_FIELDS.welcome.max} placeholder="Bienvenue au Comptoir ! Happy hour jusqu'à 22 h." />
    <small>Affiché au-dessus du code, pendant que les joueurs rejoignent.</small>
  </label>
</div>

<style>
  .vb { display: flex; flex-direction: column; gap: 18px; }
  .vb-drop {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 120px;
    padding: 18px;
    border: 2px dashed var(--border2);
    border-radius: 12px;
    background: var(--bg);
    text-align: center;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .vb-drop:hover, .vb-drop.on { border-color: var(--accent); background: rgb(var(--accent-rgb) / 0.06); }
  .vb-drop input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .vb-drop b { font-size: 0.92rem; color: var(--text); }
  .vb-drop span { font-size: 0.78rem; color: var(--dim); }
  .vb-drop img { height: 64px; max-width: 180px; object-fit: contain; }
  .vb-link { align-self: flex-start; padding: 0; border: 0; background: none; color: var(--dim); font: inherit; font-size: 0.8rem; text-decoration: underline; cursor: pointer; }
  .vb-colors { display: flex; flex-wrap: wrap; gap: 10px; }
  .vb-sw {
    position: relative;
    width: 38px;
    height: 38px;
    padding: 0;
    border: 2px solid var(--bg);
    border-radius: 50%;
    box-shadow: 0 0 0 1px var(--border2);
    cursor: pointer;
  }
  .vb-sw.sel { box-shadow: 0 0 0 2px var(--text); }
  .vb-zik { background: #ff00ff; color: #000; font-family: "Barlow Condensed", sans-serif; font-size: 0.72rem; font-weight: 900; }
  .vb-custom { overflow: hidden; background: conic-gradient(#f43f5e, #eab308, #22c55e, #0ea5e9, #8b5cf6, #f43f5e); }
  .vb-custom input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
</style>
