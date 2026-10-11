<script>
  import RoomPlaylistPicker from './RoomPlaylistPicker.svelte';
  import RoomSettings from './RoomSettings.svelte';
  import RoomCreated from './RoomCreated.svelte';
  import { maxRounds } from '$lib/rooms/settings.js';
  import { toast } from '$lib/toast.svelte.js';

  let { open, editing = null, store, onClose, onJoin } = $props();

  let ready = $state(false);
  let created = $state(null);
  let name = $state('');
  let desc = $state('');
  let showDesc = $state(false);
  let emoji = $state('🎵');
  let playlistIds = $state([]);
  let settings = $state({ rounds: 10, duration: 30, pause: 7 });
  let isPublic = $state(true);
  let autoStart = $state(false);
  let mode = $state('classic');
  let error = $state('');
  let saving = $state(false);

  const trackCount = $derived(
    playlistIds.reduce((n, id) => n + (store.playlists.find((p) => p.id === id)?.track_count || 0), 0)
  );

  // Moins de titres que de manches : on ramène les manches au plafond.
  $effect(() => {
    const max = maxRounds(trackCount);
    if (ready && playlistIds.length && settings.rounds > max) settings.rounds = max;
  });

  $effect(() => {
    if (!open) return;
    ready = false;
    created = null;
    error = '';
    load();
  });

  async function load() {
    try {
      await store.loadPlaylists();
      const r = editing ? await store.getRoom(editing.code) : {};
      name = r.name || ''; desc = r.description || ''; emoji = r.emoji || '🎵';
      showDesc = !!desc;
      playlistIds = r.playlist_ids || [];
      settings = { rounds: r.max_rounds || 10, duration: r.round_duration || 30, pause: r.break_duration || 7 };
      isPublic = r.is_public !== false; autoStart = r.auto_start || false; mode = r.game_mode || 'classic';
      ready = true;
    } catch (e) { toast('Impossible de charger la room : ' + e.message, 'error'); onClose(); }
  }

  async function save() {
    if (!name.trim()) { error = 'Donne un nom à la room.'; return; }
    if (!playlistIds.length) { error = 'Choisis au moins une playlist.'; return; }
    saving = true; error = '';
    try {
      const d = await store.save({
        name, emoji, description: desc, playlist_ids: playlistIds, is_public: isPublic,
        max_rounds: settings.rounds, round_duration: settings.duration, break_duration: settings.pause,
        auto_start: autoStart, game_mode: mode,
      }, editing?.id);
      if (editing) { toast('Room mise à jour !', 'success'); onClose(); }
      else created = { code: d.code, name, game_mode: mode };
    } catch (e) { error = e.message; }
    saving = false;
  }
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') onClose(); }} />

{#if open}
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
<div class="rm-overlay" role="dialog" aria-modal="true" aria-labelledby="rm-title" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
  <div class="rm" class:small={created}>
    {#if created}
      <RoomCreated room={created} {onClose} onJoin={() => onJoin(created)} />
    {:else}
      <header class="rm-head">
        <div>
          <h2 id="rm-title">{editing ? 'Modifier la room' : 'Nouvelle room'}</h2>
          {#if editing}<span class="rm-code">{editing.code}</span>{/if}
        </div>
        <button class="rm-x" onclick={onClose} aria-label="Fermer">✕</button>
      </header>

      <div class="rm-body">
        {#if !ready}
          <p class="rm-msg">Chargement...</p>
        {:else}
          <div class="rm-a">
            <input class="rm-name" bind:value={name} maxlength="60" placeholder="Nom de la room" aria-label="Nom de la room">
            {#if showDesc}
              <textarea class="rm-desc" bind:value={desc} maxlength="200" rows="2" placeholder="Un mot pour présenter la room" aria-label="Description"></textarea>
            {:else}
              <button class="rm-add-desc" onclick={() => showDesc = true}>+ Ajouter une description</button>
            {/if}
          </div>

          <div class="rm-b">
            <RoomPlaylistPicker playlists={store.playlists} bind:selected={playlistIds} />
          </div>

          <div class="rm-c">
            <span class="rm-label">Mode de jeu</span>
            <div class="rm-modes" role="radiogroup" aria-label="Mode de jeu">
              <button role="radio" aria-checked={mode === 'classic'} class:on={mode === 'classic'} onclick={() => mode = 'classic'}>
                <strong>⌨ Classique</strong><span>On tape la réponse · classement ELO</span>
              </button>
              <button role="radio" aria-checked={mode === 'qcm'} class:on={mode === 'qcm'} onclick={() => mode = 'qcm'}>
                <strong>🎯 QCM</strong><span>4 choix · sans ELO, plus détendu</span>
              </button>
            </div>

            <RoomSettings bind:value={settings} {trackCount} hasPlaylists={playlistIds.length > 0} />

            <label class="rm-toggle">
              <input type="checkbox" bind:checked={isPublic}>
              <span class="rm-sw" aria-hidden="true"></span>
              <span><strong>Publique</strong><em>{isPublic ? 'Visible par tous dans la liste des rooms' : 'Accessible seulement avec le code'}</em></span>
            </label>
            <label class="rm-toggle">
              <input type="checkbox" bind:checked={autoStart}>
              <span class="rm-sw" aria-hidden="true"></span>
              <span><strong>Démarrage automatique</strong><em>{autoStart ? 'La partie part 5 s après l\'arrivée d\'un joueur' : 'Tu lances la partie toi-même'}</em></span>
            </label>
            {#if !editing}<p class="rm-tip">💡 Room permanente. Pour une partie rapide sans créer de room, lance-la depuis <a href="/playlists">tes playlists</a>.</p>{/if}
          </div>
        {/if}
      </div>

      {#if error}<p class="rm-err">{error}</p>{/if}
      <footer class="rm-foot">
        <button class="btn-ghost" onclick={onClose}>Annuler</button>
        <button class="btn-accent" onclick={save} disabled={saving || !ready}>{saving ? '...' : editing ? 'Enregistrer' : 'Créer la room'}</button>
      </footer>
    {/if}
  </div>
</div>
{/if}

<style>
  .rm-overlay { position: fixed; inset: 0; z-index: 700; display: flex; align-items: center; justify-content: center; padding: 20px; background: var(--overlay); backdrop-filter: blur(6px); }
  .rm {
    width: min(920px, 100%);
    max-height: min(840px, calc(100dvh - 40px));
    display: flex;
    flex-direction: column;
    background: var(--modal-bg);
    border: 1px solid var(--border2);
    border-radius: 18px;
    box-shadow: 0 24px 70px rgb(0 0 0 / 0.55);
    overflow: hidden;
  }
  .rm.small { width: min(480px, 100%); }
  .rm-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 12px 14px 22px; border-bottom: 1px solid var(--border); }
  .rm-head h2 { margin: 0; font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1.5rem; text-transform: uppercase; display: inline; }
  .rm-code { margin-left: 10px; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.8rem; color: var(--accent); letter-spacing: 0.12em; }
  .rm-x { width: 44px; height: 44px; border: none; background: none; color: var(--dim); font-size: 1rem; cursor: pointer; }
  .rm-x:hover { color: var(--text); }
  .rm-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-areas: "a b" "c b";
    grid-template-rows: auto 1fr;
    gap: 14px 26px;
    padding: 18px 22px;
    overscroll-behavior: contain;
  }
  .rm-a { grid-area: a; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .rm-b { grid-area: b; display: flex; flex-direction: column; min-width: 0; }
  .rm-c { grid-area: c; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
  .rm-msg { grid-column: 1 / -1; color: var(--mid); font-size: 0.85rem; }
  .rm-label { margin-top: 4px; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
  .rm-name {
    padding: 4px 0 8px;
    border: none;
    border-bottom: 1px solid var(--border2);
    background: none;
    color: var(--text);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 1.6rem;
    text-transform: uppercase;
    outline: none;
  }
  .rm-name:focus { border-color: var(--accent); }
  .rm-add-desc { align-self: flex-start; padding: 4px 0; border: none; background: none; color: var(--mid); font: inherit; font-size: 0.78rem; cursor: pointer; }
  .rm-add-desc:hover { color: var(--accent); }
  .rm-desc { padding: 8px 12px; border: 1px solid var(--border2); border-radius: 9px; background: rgb(var(--c-glass) / 0.04); color: var(--text); font: inherit; font-size: 0.85rem; resize: vertical; outline: none; }
  .rm-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .rm-modes button {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 10px 12px;
    border: 1px solid var(--border2);
    border-radius: 11px;
    background: none;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }
  .rm-modes button.on { border-color: var(--accent); background: rgb(var(--accent-rgb) / 0.1); }
  .rm-modes strong { font-size: 0.9rem; }
  .rm-modes span { font-size: 0.7rem; color: var(--mid); }
  .rm-toggle { display: flex; align-items: center; gap: 12px; padding: 6px 0; cursor: pointer; }
  .rm-toggle input { position: absolute; opacity: 0; pointer-events: none; }
  .rm-sw { position: relative; width: 40px; height: 22px; flex-shrink: 0; border-radius: 999px; background: rgb(var(--c-glass) / 0.18); transition: background 0.15s; }
  .rm-sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform 0.15s; }
  .rm-toggle input:checked + .rm-sw { background: var(--accent); }
  .rm-toggle input:checked + .rm-sw::after { transform: translateX(18px); }
  .rm-toggle input:focus-visible + .rm-sw { outline: 2px solid var(--accent); outline-offset: 2px; }
  .rm-toggle strong { display: block; font-size: 0.86rem; }
  .rm-toggle em { font-style: normal; font-size: 0.72rem; color: var(--dim); }
  .rm-tip { margin: 0; padding: 10px 12px; border-radius: 10px; background: rgb(var(--accent-rgb) / 0.06); font-size: 0.74rem; color: var(--mid); }
  .rm-tip a { color: var(--accent); }
  .rm-err { margin: 0; padding: 8px 22px; color: var(--danger); font-size: 0.82rem; }
  .rm-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 22px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--border); }
  .rm-foot button { min-height: 44px; min-width: 120px; }

  /* Mobile : nom, puis playlists (le choix principal), puis le reste */
  @media (max-width: 760px) {
    .rm-overlay { padding: 0; }
    .rm, .rm.small { width: 100%; height: 100dvh; max-height: none; border-radius: 0; border: none; }
    .rm-body { grid-template-columns: 1fr; grid-template-areas: "a" "b" "c"; grid-template-rows: auto; gap: 18px; padding: 16px; }
    .rm-foot button { flex: 1; }
  }
</style>
