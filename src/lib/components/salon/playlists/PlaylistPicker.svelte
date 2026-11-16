<script>
  import SleeveArt from './SleeveArt.svelte';
  import LoadMore from '$lib/components/ui/LoadMore.svelte';
  import { fuzzyFilter } from '$lib/shared/fuzzy.js';

  let { playlists = [], selectedIds = $bindable([]), onLogin = null } = $props();

  // Pochettes à aplat : une couleur par disque, jamais de dégradé
  const SLEEVES = ['#f4e04d', '#ff6b35', '#2ec4b6', '#ff4f9a', '#8c7bff', '#f2ede3', '#3ddc84', '#ffb627', '#5bc0eb', '#e94f37'];
  // 200 playlists publiques et plus : la liste se déplie par pages au lieu d'une boîte à défilement
  const PAGE = 20;

  let searchQuery   = $state('');
  let showCommunity = $state(false);
  let shown         = $state(PAGE);

  let q         = $derived(searchQuery.trim());
  let found     = $derived(fuzzyFilter(playlists, q, ['name']));
  let official  = $derived(found.filter(p => p.group === 'official'));
  let mine      = $derived(found.filter(p => p.group === 'mine'));
  let community = $derived(found.filter(p => p.group === 'public'));
  let communityTotal = $derived(playlists.filter(p => p.group === 'public').length);

  function toggle(pl) {
    selectedIds = selectedIds.includes(pl.id)
      ? selectedIds.filter(id => id !== pl.id)
      : [...selectedIds, pl.id];
  }
</script>

{#snippet row(pl)}
  {@const on = selectedIds.includes(pl.id)}
  <button type="button" class="pp-row" onclick={() => toggle(pl)} aria-pressed={on}>
    <span class="pp-row-name">{pl.name}</span>
    {#if pl.trackCount}<small>{pl.trackCount}</small>{/if}
    <i aria-hidden="true">✓</i>
  </button>
{/snippet}

<div class="pp">
  <input class="pp-search" type="search" placeholder="Chercher une playlist…" aria-label="Chercher une playlist"
    bind:value={searchQuery} oninput={() => (shown = PAGE)} autocomplete="off">

  {#if official.length}
    <ul class="pp-crate">
      {#each official as pl, i (pl.id)}
        <li>
          <button type="button" class="pp-sleeve" style="--sleeve:{SLEEVES[i % SLEEVES.length]}" onclick={() => toggle(pl)} aria-pressed={selectedIds.includes(pl.id)}>
            <span class="pp-disc" aria-hidden="true"></span>
            <span class="pp-cover">
              <SleeveArt id={pl.id} />
              <b>{pl.name}</b>
              <small>{pl.trackCount} titres</small>
            </span>
            <span class="pp-stamp" aria-hidden="true">Au programme</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if mine.length}
    <div class="pp-list">
      <p class="pp-h">Mes playlists</p>
      {#each mine as pl (pl.id)}{@render row(pl)}{/each}
    </div>
  {/if}

  {#if community.length && (showCommunity || q)}
    <div class="pp-list">
      <p class="pp-h">Playlists de la communauté</p>
      {#each community.slice(0, shown) as pl (pl.id)}{@render row(pl)}{/each}
      <LoadMore hasMore={community.length > shown} onLoad={() => (shown += PAGE)} />
    </div>
  {/if}

  {#if q && !found.length}
    <p class="pp-sous">Aucune playlist ne correspond.</p>
  {:else if !q && ((onLogin && !mine.length) || (communityTotal && !showCommunity))}
    <p class="pp-sous">
      {#if onLogin && !mine.length}
        <span>Ta playlist Deezer ? <button type="button" class="pp-lien" onclick={onLogin}>Connecte-toi pour l'importer</button></span>
      {/if}
      {#if communityTotal && !showCommunity}
        <button type="button" class="pp-lien" onclick={() => (showCommunity = true)}>+ {communityTotal} playlists de la communauté</button>
      {/if}
    </p>
  {/if}
</div>

<style>
  .pp { container-type: inline-size; display: grid; gap: 14px; min-width: 0; }
  .pp-search {
    width: 100%;
    height: 48px;
    padding: 0 2px;
    border: 0;
    border-bottom: 1px solid var(--line-2);
    border-radius: 0;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: 16px;
  }
  .pp-search::placeholder { color: var(--muted); }
  .pp-search:focus-visible { outline: 0; border-bottom-color: var(--text); }

  /* Le bac à disques : la pochette cochée laisse sortir son vinyle */
  .pp-crate {
    display: flex;
    gap: 24px;
    margin: 0;
    padding: 8px 30px 12px 0;
    list-style: none;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }
  .pp-crate li { flex: 0 0 142px; scroll-snap-align: start; }
  .pp-sleeve {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 1;
    padding: 0;
    border: 0;
    background: none;
    color: #111;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .pp-disc {
    position: absolute;
    inset: 5%;
    border-radius: 50%;
    background:
      radial-gradient(circle, var(--sleeve) 0 15%, #111 16% 18%, transparent 19%),
      repeating-radial-gradient(circle, #151515 0 2px, #1f1f1f 2px 3px);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12);
    transition: transform 0.4s var(--pop);
  }
  .pp-cover {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 3px;
    padding: 10px 11px;
    overflow: hidden;
    border-radius: 6px;
    background: var(--sleeve);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
    transition: transform 0.25s var(--out);
  }
  .pp-cover b {
    position: relative;
    font-family: var(--titre);
    font-weight: 900;
    font-size: 1.4rem;
    line-height: 0.92;
    text-transform: uppercase;
    overflow-wrap: anywhere;
  }
  .pp-cover small {
    position: relative;
    font-family: var(--mono);
    font-size: 13px;
    line-height: 1.2;
    opacity: 0.75;
  }
  .pp-stamp {
    position: absolute;
    top: 9px;
    left: 9px;
    z-index: 1;
    display: none;
    padding: 1px 6px;
    border: 2px solid #111;
    background: var(--sleeve);
    font-family: var(--titre);
    font-weight: 800;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transform: rotate(-5deg);
  }
  .pp-sleeve[aria-pressed='true'] .pp-disc { transform: translateX(17%) rotate(40deg); }
  .pp-sleeve[aria-pressed='true'] .pp-cover { transform: translateX(-3%); }
  .pp-sleeve[aria-pressed='true'] .pp-stamp { display: block; }
  .pp-sleeve[aria-pressed='true'] :global(.sleeve-art) { opacity: 0.16; }
  .pp-sleeve:hover:not([aria-pressed='true']) .pp-cover { transform: translateY(-3px); }
  .pp-sleeve:focus-visible { outline-offset: 4px; }

  .pp-list { display: grid; }
  .pp-h {
    padding: 6px 0 8px;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .pp-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 22px;
    gap: 12px;
    align-items: center;
    min-height: 48px;
    padding: 0 2px;
    border: 0;
    border-top: 1px solid var(--line);
    background: none;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .pp-row-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pp-row small { font-family: var(--mono); font-size: 13px; color: var(--muted); }
  .pp-row i {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border: 1px solid var(--line-2);
    border-radius: 6px;
    color: transparent;
    font-style: normal;
    font-size: 14px;
  }
  .pp-row[aria-pressed='true'] i { background: var(--text); border-color: var(--text); color: #000; }
  .pp-row:hover .pp-row-name { text-decoration: underline; text-underline-offset: 3px; }

  .pp-sous { display: flex; flex-wrap: wrap; align-items: center; gap: 0 18px; font-size: 15px; color: var(--muted); }
  .pp-lien {
    min-height: 44px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--text);
    font: inherit;
    font-weight: 600;
    text-decoration: underline;
    text-decoration-color: var(--line-2);
    text-underline-offset: 5px;
    cursor: pointer;
  }

  @container (min-width: 560px) {
    .pp-crate {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
      gap: 26px 22px;
      overflow: visible;
    }
    .pp-cover b { font-size: 1.2rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pp-disc, .pp-cover { transition: none; }
  }
</style>
