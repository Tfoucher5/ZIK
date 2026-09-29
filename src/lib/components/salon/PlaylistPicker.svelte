<script>
  import SleeveArt from './SleeveArt.svelte';

  let { playlists = [], selectedIds = $bindable([]), onLogin = null } = $props();

  // Pochettes à aplat : une couleur par disque, jamais de dégradé
  const SLEEVES = ['#f4e04d', '#ff6b35', '#2ec4b6', '#ff4f9a', '#8c7bff', '#f2ede3', '#3ddc84', '#ffb627', '#5bc0eb', '#e94f37'];

  let searchQuery    = $state('');
  let showCommunity  = $state(false);

  let q = $derived(searchQuery.trim().toLowerCase());
  let match = (p) => !q || p.name.toLowerCase().includes(q);

  let official  = $derived(playlists.filter(p => p.group === 'official' && match(p)));
  let mine      = $derived(playlists.filter(p => p.group === 'mine' && match(p)));
  let community = $derived(playlists.filter(p => p.group === 'public' && match(p)));

  function toggle(pl) {
    selectedIds = selectedIds.includes(pl.id)
      ? selectedIds.filter(id => id !== pl.id)
      : [...selectedIds, pl.id];
  }
</script>

{#snippet row(pl)}
  {@const on = selectedIds.includes(pl.id)}
  <button type="button" class="pp-row" class:on onclick={() => toggle(pl)} aria-pressed={on}>
    <span class="pp-row-emoji" aria-hidden="true">{pl.emoji}</span>
    <span class="pp-row-name">{pl.name}</span>
    {#if pl.trackCount}<span class="pp-row-count">{pl.trackCount}</span>{/if}
    <span class="pp-row-box" aria-hidden="true"></span>
  </button>
{/snippet}

<input class="pp-search" type="search" placeholder="Chercher une playlist…" bind:value={searchQuery} autocomplete="off">

{#if official.length}
  <ul class="pp-crate">
    {#each official as pl, i (pl.id)}
      {@const on = selectedIds.includes(pl.id)}
      <li>
        <button type="button" class="pp-sleeve" class:on style="--sleeve:{SLEEVES[i % SLEEVES.length]}" onclick={() => toggle(pl)} aria-pressed={on}>
          <span class="pp-disc" aria-hidden="true"></span>
          <span class="pp-cover">
            <SleeveArt id={pl.id} />
            <span class="pp-name">{pl.name}</span>
            <span class="pp-count">{pl.trackCount} titres</span>
            {#if on}<span class="pp-stamp">Au programme</span>{/if}
          </span>
        </button>
      </li>
    {/each}
  </ul>
{/if}

{#if mine.length}
  <h3 class="pp-h">Mes playlists</h3>
  <div class="pp-list">{#each mine as pl (pl.id)}{@render row(pl)}{/each}</div>
{:else if onLogin && !q}
  <p class="pp-login">
    Ta playlist Spotify ou Deezer ?
    <button type="button" onclick={onLogin}>Connecte-toi pour l'importer</button>
  </p>
{/if}

{#if community.length}
  {#if showCommunity || q}
    <h3 class="pp-h">Playlists de la communauté</h3>
    <div class="pp-list pp-list-scroll">{#each community as pl (pl.id)}{@render row(pl)}{/each}</div>
  {:else}
    <button type="button" class="pp-more" onclick={() => (showCommunity = true)}>
      + {community.length} playlists de la communauté
    </button>
  {/if}
{/if}

{#if q && !official.length && !mine.length && !community.length}
  <p class="pp-empty">Aucune playlist ne correspond.</p>
{/if}

<style>
  .pp-search {
    width: 100%;
    padding: 11px 14px;
    margin-bottom: 18px;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--border2);
    color: var(--text);
    font: inherit;
    font-size: 0.95rem;
    outline: none;
  }
  .pp-search:focus { border-bottom-color: var(--text); }

  .pp-crate {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    gap: 22px 18px;
    padding: 0 24px 0 0;
  }
  .pp-sleeve {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 1;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    font: inherit;
    text-align: left;
  }
  .pp-cover {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 4px;
    padding: 10px 11px;
    background: var(--sleeve);
    color: #111;
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.12), 0 2px 0 rgb(0 0 0 / 0.5);
    transition: transform 0.18s ease;
  }
  .pp-count, .pp-name, .pp-stamp { position: relative; z-index: 1; }
  .pp-count {
    font-family: var(--s-mono);
    font-size: 0.62rem;
    letter-spacing: 0.06em;
    opacity: 0.7;
  }
  .pp-name {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 1.35rem;
    line-height: 0.92;
    text-transform: uppercase;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
  }
  .pp-disc {
    position: absolute;
    top: 5%;
    left: 5%;
    width: 90%;
    height: 90%;
    border-radius: 50%;
    background:
      radial-gradient(circle, var(--sleeve) 0 15%, #111 16% 18%, transparent 19%),
      repeating-radial-gradient(circle, #151515 0 2px, #1f1f1f 2px 3px);
    box-shadow: 0 0 0 1px rgb(255 255 255 / 0.12);
    transition: transform 0.25s cubic-bezier(0.3, 1.4, 0.5, 1);
  }
  .pp-sleeve.on .pp-disc { transform: translateX(16%) rotate(40deg); }
  .pp-sleeve.on .pp-cover { transform: translateX(-3%); }
  .pp-sleeve:hover:not(.on) .pp-cover { transform: translateY(-3px); }
  .pp-sleeve:focus-visible { outline: 2px solid var(--text); outline-offset: 4px; }
  .pp-stamp {
    position: absolute;
    top: 9px;
    left: 9px;
    padding: 2px 6px;
    border: 2px solid #111;
    font-family: var(--s-cond);
    font-weight: 800;
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    transform: rotate(6deg);
  }

  .pp-h {
    margin: 30px 0 8px;
    font-family: var(--s-mono);
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .pp-list { display: flex; flex-direction: column; }
  .pp-list-scroll { max-height: 280px; overflow-y: auto; }
  .pp-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 4px;
    background: none;
    border: 0;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .pp-row:hover .pp-row-name { text-decoration: underline; text-underline-offset: 3px; }
  .pp-row-emoji { width: 22px; text-align: center; }
  .pp-row-name { flex: 1; font-size: 0.92rem; font-weight: 600; }
  .pp-row-count { font-family: var(--s-mono); font-size: 0.72rem; color: var(--mid); }
  .pp-row-box {
    width: 16px;
    height: 16px;
    border: 1.5px solid var(--border2);
    border-radius: 2px;
  }
  .pp-row.on .pp-row-box {
    background: var(--accent);
    border-color: var(--accent);
    box-shadow: inset 0 0 0 3px var(--bg);
  }

  .pp-login, .pp-empty { margin-top: 26px; font-size: 0.88rem; color: var(--mid); }
  .pp-login button {
    background: none;
    border: 0;
    padding: 0;
    color: var(--text);
    font: inherit;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
  .pp-more {
    margin-top: 26px;
    background: none;
    border: 1px dashed var(--border2);
    border-radius: 3px;
    padding: 10px 14px;
    color: var(--mid);
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .pp-more:hover { color: var(--text); border-color: var(--text); }

  @media (max-width: 520px) {
    .pp-crate { grid-template-columns: repeat(2, 1fr); gap: 18px 16px; }
    .pp-name { font-size: 1.15rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pp-disc, .pp-cover { transition: none; }
  }
</style>
