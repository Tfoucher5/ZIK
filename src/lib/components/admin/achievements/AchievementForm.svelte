<script>
  import { enhance } from '$app/forms';
  import { CATEGORIES, RARITIES, LEVELS } from './labels.js';

  /** Création ou modification d'un succès, unique ou à paliers. */
  let { def = $bindable(), busy, submit, error = null } = $props();
</script>

<form method="POST" action={def.mode === 'create' ? '?/createAchievement' : '?/editAchievement'} class="a-form" use:enhance={submit}>
  <div class="a-form-row">
    <label class="a-label icon-field">Icône<input class="a-input" name="icon" maxlength="4" bind:value={def.icon} /></label>
    <label class="a-label">Nom<input class="a-input" name="name" required bind:value={def.name} /></label>
  </div>
  <label class="a-label">Description<input class="a-input" name="description" bind:value={def.description} /></label>
  {#if def.mode === 'create'}
    <label class="a-label">
      Identifiant
      <input class="a-input" name="id" required pattern="[a-z0-9_]+" bind:value={def.id} placeholder="ex. zikle_streak" />
      <span class="a-muted small">Le jeu ne débloque un succès que si son identifiant est prévu dans le code. Sinon il ne s'attribue qu'à la main.</span>
    </label>
  {:else}
    <input type="hidden" name="id" value={def.id} />
    <p class="a-muted small">Identifiant : <code>{def.id}</code></p>
  {/if}
  <div class="a-form-row">
    <label class="a-label">Catégorie
      <select class="a-select" name="category" bind:value={def.category}>
        {#each Object.entries(CATEGORIES) as [k, l] (k)}<option value={k}>{l}</option>{/each}
      </select>
    </label>
    <label class="a-label">Rareté
      <select class="a-select" name="rarity" bind:value={def.rarity}>
        {#each Object.entries(RARITIES) as [k, l] (k)}<option value={k}>{l}</option>{/each}
      </select>
    </label>
    <label class="a-label">Type
      <select class="a-select" name="type" bind:value={def.type}>
        <option value="one_time">Unique</option>
        <option value="tiered">Paliers (bronze, argent, or)</option>
      </select>
    </label>
  </div>
  {#if def.type === 'tiered'}
    <input type="hidden" name="tiers_json" value={JSON.stringify(def.tiers)} />
    <fieldset class="tiers">
      <legend class="a-label">Paliers</legend>
      {#each def.tiers as t, i (i)}
        <div class="tier">
          <select class="a-select" aria-label="Niveau" bind:value={t.level}>
            {#each Object.entries(LEVELS) as [k, l] (k)}<option value={k}>{l}</option>{/each}
          </select>
          <input class="a-input" type="number" min="1" aria-label="Objectif" bind:value={t.target} />
          <select class="a-select" aria-label="Rareté du palier" bind:value={t.rarity}>
            {#each Object.entries(RARITIES) as [k, l] (k)}<option value={k}>{l}</option>{/each}
          </select>
          <button class="a-btn small" type="button" aria-label="Retirer ce palier" onclick={() => def.tiers.splice(i, 1)}>✕</button>
        </div>
      {/each}
      {#if def.tiers.length < 3}
        <button class="a-btn small" type="button" onclick={() => def.tiers.push({ level: ['bronze', 'silver', 'gold'][def.tiers.length], target: 1, rarity: 'common' })}>Ajouter un palier</button>
      {/if}
    </fieldset>
  {/if}
  <button class="a-btn primary" type="submit" disabled={busy === 'def'}>{busy === 'def' ? 'Enregistrement…' : 'Enregistrer'}</button>
  {#if error}<p class="a-err">{error}</p>{/if}
</form>

<style>
  .small { font-size: 0.82rem; }
  .icon-field { max-width: 110px; }
  .tiers { display: grid; gap: 8px; border: 0; }
  .tier { display: grid; grid-template-columns: 1fr 90px 1fr auto; gap: 6px; align-items: center; }
  code { font-family: 'JetBrains Mono', monospace; }
</style>
