<script>
  import SearchResults from './SearchResults.svelte';
  import CatalogExplorer from './CatalogExplorer.svelte';
  import PasteImport from './PasteImport.svelte';
  import LinkImport from './LinkImport.svelte';
  import YoutubeAdd from './YoutubeAdd.svelte';
  import Suggestions from './Suggestions.svelte';
  import { detectInput } from '$lib/shared/playlist/input.js';
  import { SuggestionsState } from './suggestions.svelte.js';

  let { store, onClose } = $props();

  // svelte-ignore state_referenced_locally
  const sugg = new SuggestionsState(store);

  let text = $state('');
  let explore = $state(null);
  let pasteText = $state(null);
  let inputEl = $state();
  let results = $state();

  const input = $derived(detectInput(text));
  const linkTarget = $derived(
    input.kind === 'deezer-artist' ? { type: 'artist', id: input.id }
      : input.kind === 'deezer-album' ? { type: 'album', id: input.id } : null
  );
  const target = $derived(explore ?? linkTarget);
  const view = $derived(target ? 'explore' : pasteText !== null ? 'paste' : input.kind);

  function reset() {
    text = '';
    explore = null;
    pasteText = null;
    inputEl?.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape') { if (explore) explore = null; else reset(); return; }
    if (view === 'search' && results?.key(e) && e.key === 'Enter') inputEl.select();
  }

  // Une liste collée dans le champ d'une ligne perdrait ses retours à la ligne.
  function onPaste(e) {
    const data = e.clipboardData?.getData('text') ?? '';
    if (detectInput(data).kind !== 'list') return;
    e.preventDefault();
    explore = null;
    pasteText = data;
  }
</script>

<div class="add">
  <div class="add-sheet-head">
    <strong>Ajouter des titres</strong>
    {#if store.sessionAdded}<span class="add-count">+{store.sessionAdded}</span>{/if}
    <button class="btn-accent sm" onclick={onClose}>Terminé</button>
  </div>

  <div class="add-bar">
    <span class="add-icon" aria-hidden="true">+</span>
    <input bind:this={inputEl} bind:value={text} type="search" class="add-input" autocomplete="off" spellcheck="false"
      placeholder="Titre, artiste, lien Deezer ou YouTube..." aria-label="Ajouter un titre : recherche ou lien"
      oninput={() => { explore = null; pasteText = null; }} onkeydown={onKey} onpaste={onPaste}>
    {#if text}<button class="add-clear" onclick={reset} aria-label="Effacer">✕</button>{/if}
  </div>
  {#if view === 'empty'}
    <button class="add-paste-btn" onclick={() => pasteText = ''}>📋 Coller une liste de titres</button>
  {/if}

  <div class="add-body">
    {#if view === 'explore'}
      <CatalogExplorer {target} {store} onNavigate={(t) => explore = t}
        onBack={() => { if (explore && linkTarget !== explore) explore = null; else reset(); }} />
    {:else if view === 'paste'}
      <PasteImport initialText={pasteText} {store} onClose={reset} />
    {:else if view === 'search'}
      <SearchResults bind:this={results} q={input.q} {store}
        onArtist={(id) => explore = { type: 'artist', id }} onAlbum={(id) => explore = { type: 'album', id }} />
    {:else if view === 'deezer-playlist' || view === 'spotify-playlist'}
      <LinkImport source={view.split('-')[0]} id={input.id} {store} onDone={reset} />
    {:else if view === 'youtube'}
      <YoutubeAdd id={input.id} {store} onDone={reset} />
    {:else if view === 'unknown-link'}
      <p class="add-msg">Lien non reconnu. Colle un lien Deezer (playlist, album, artiste), YouTube ou Spotify.</p>
    {:else}
      <Suggestions {sugg} {store} onArtist={(id) => explore = { type: 'artist', id }} onAlbum={(id) => explore = { type: 'album', id }} />
    {/if}
  </div>
</div>

<style>
  .add { display: flex; flex-direction: column; min-height: 0; height: 100%; }
  .add-sheet-head { display: none; }
  .add-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 8px;
    padding: 0 6px 0 14px;
    border: 1px solid var(--border2);
    border-radius: 12px;
    background: rgb(var(--c-glass) / 0.04);
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .add-bar:focus-within { border-color: rgb(var(--accent-rgb) / 0.6); box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.12); }
  .add-icon { color: var(--accent); font-size: 1.3rem; font-weight: 300; line-height: 1; }
  .add-input {
    flex: 1;
    min-width: 0;
    height: 48px;
    border: none;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: 0.95rem;
    outline: none;
  }
  .add-input::-webkit-search-cancel-button { display: none; }
  .add-clear { width: 36px; height: 36px; border: none; background: none; color: var(--dim); cursor: pointer; }
  .add-clear:hover { color: var(--text); }
  .add-paste-btn {
    align-self: flex-start;
    margin: 0 0 12px;
    padding: 6px 4px;
    border: none;
    background: none;
    color: var(--mid);
    font: inherit;
    font-size: 0.78rem;
    cursor: pointer;
  }
  .add-paste-btn:hover { color: var(--accent); }
  .add-body { flex: 1; min-height: 0; overflow-y: auto; margin: 0 -8px; padding-bottom: 12px; scrollbar-width: thin; }
  .add-msg { padding: 12px 8px; font-size: 0.8rem; color: var(--mid); }

  @media (max-width: 900px) {
    .add-sheet-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 0 12px;
    }
    .add-sheet-head strong {
      font-family: "Barlow Condensed", sans-serif;
      font-weight: 900;
      font-size: 1.1rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .add-sheet-head .btn-accent { margin-left: auto; min-height: 40px; }
    .add-count {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--success);
    }
  }
</style>
