<script>
  import { RARITIES, RARITY_ORDER } from '../rarity.js';
  import { fmt, pct } from './collection.js';
  import CollectionProgress from './CollectionProgress.svelte';

  let { data, cards, rarity, setParam } = $props();

  const counts = $derived(
    Object.fromEntries(RARITY_ORDER.map((r) => [r, cards.filter((c) => c.rarity === r).length])),
  );
  const completedSets = $derived((data?.sets ?? []).filter((s) => s.completedAt).length);
  // Objectif : tout le catalogue, et chaque rareté
  const catalog = $derived(data?.catalog ?? { total: 0, byRarity: {} });
</script>

<header class="col-head">
  <div>
    <h1 class="col-title">{data.isOwner ? 'Ma collection' : `Collection de ${data.profile.username}`}</h1>
    <p class="col-sub">
      <strong class="col-total">{fmt(cards.length)}</strong> / {fmt(catalog.total)} cartes{#if completedSets}, {completedSets} set{completedSets > 1 ? 's' : ''} complété{completedSets > 1 ? 's' : ''}{/if}
    </p>
    <CollectionProgress total width={pct(cards.length, catalog.total)} label={`${cards.length} cartes sur ${catalog.total}`} />
  </div>
  <div>
  <p class="col-rar-title" id="col-rar-title">Par rareté, touche pour filtrer</p>
  <div class="col-rarities" role="group" aria-labelledby="col-rar-title">
    {#each RARITY_ORDER as r (r)}
      <button
        type="button"
        class="col-rar"
        data-rarity={r}
        aria-pressed={rarity === r}
        disabled={!counts[r]}
        onclick={() => setParam({ rarete: rarity === r ? '' : r })}
      >
        <span class="col-rar-disc" aria-hidden="true"></span>
        <span class="col-rar-label">{RARITIES[r].label}</span>
        <strong>{counts[r]}<small>&nbsp;/&nbsp;{fmt(catalog.byRarity[r] ?? 0)}</small></strong>
        <span class="col-rar-bar" aria-hidden="true"><i style:width={pct(counts[r], catalog.byRarity[r])}></i></span>
      </button>
    {/each}
  </div>
  </div>
</header>

<style>
  .col-head {
    display: grid;
    gap: 18px;
  }

  .col-title {
    margin: 0;
    font: 700 clamp(2.2rem, 5vw, 3.4rem) / 1 'Barlow Condensed', sans-serif;
  }

  .col-sub {
    margin: 6px 0 0;
    color: var(--mid);
  }

  .col-rar-title {
    margin: 0 0 8px;
    font: 600 0.82rem/1.2 'Barlow', sans-serif;
    color: var(--mid);
  }

  .col-rarities {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
  }

  /* Nom, puis possédées / total, puis la barre : rien ne déborde, même étroit */
  .col-rar {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 8px 10px;
    min-width: 0;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    color: var(--text);
    font: 600 0.92rem/1 'Barlow', sans-serif;
    text-align: left;
    cursor: pointer;
  }

  .col-rar strong {
    font: 700 1.15rem/1 'Barlow Condensed', sans-serif;
    font-variant-numeric: tabular-nums;
  }

  .col-rar[aria-pressed='true'] {
    border-color: var(--rc);
    box-shadow: inset 0 0 0 1px var(--rc);
    background: color-mix(in oklab, var(--rc) 14%, var(--surface));
  }

  .col-rar strong {
    grid-column: 1 / -1;
    white-space: nowrap;
  }

  .col-rar-label {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .col-rar strong small {
    font: 600 0.8rem/1 'Barlow', sans-serif;
    color: var(--mid);
  }

  /* Progression vers toutes les cartes de la rareté */
  .col-rar-bar {
    grid-column: 1 / -1;
    height: 4px;
    border-radius: 2px;
    background: var(--surface2);
    overflow: hidden;
  }

  .col-rar-bar i {
    display: block;
    height: 100%;
    background: var(--rc);
  }

  /* Rareté pas encore commencée : l'objectif reste lisible */
  .col-rar:disabled {
    opacity: 0.7;
    cursor: default;
  }

  .col-total {
    color: var(--text);
    font: 700 1.25rem/1 'Barlow Condensed', sans-serif;
  }

  .col-rar-disc {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background:
      radial-gradient(circle, #0a0a0c 0 12%, transparent 13%),
      radial-gradient(circle, var(--rc-light), var(--rc) 70%);
  }

  .col-rar[data-rarity='mythic'] .col-rar-disc {
    background:
      radial-gradient(circle, #0a0a0c 0 12%, transparent 13%),
      conic-gradient(#ff8ade, #d4a5ff, #8ff0ff, #ffc6ee, #ff8ade);
  }

  .col-rar:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
