<script>
  import { toast } from '$lib/client/toast.svelte.js';

  // Films, séries… proposés pour les titres qui n'en ont pas : rien n'est
  // enregistré sans validation, chaque nom se corrige avant
  let { playlistId, api, onClose, onSaved = () => {} } = $props();

  const TYPES = [
    { id: 3, name: 'Film' },
    { id: 4, name: 'Série' },
    { id: 7, name: 'Animé' },
    { id: 6, name: 'Jeu vidéo' },
  ];

  let loading = $state(true);
  let failed = $state(false);
  let saving = $state(false);
  let truncated = $state(false);
  let rows = $state([]);

  const chosen = $derived(rows.filter((r) => r.on && r.value.trim()));
  const found = $derived(rows.filter((r) => r.guessed).length);

  async function load() {
    loading = true;
    failed = false;
    try {
      const d = await api(`/api/playlists/${playlistId}/films`);
      truncated = d.truncated;
      rows = d.suggestions.map((s) => ({ ...s, value: s.value ?? '', guessed: !!s.value, on: !!s.value, type: 3 }));
    } catch {
      failed = true;
    }
    loading = false;
  }

  $effect(() => { if (playlistId) load(); });

  async function save() {
    saving = true;
    try {
      const { saved } = await api(`/api/playlists/${playlistId}/films`, {
        method: 'POST',
        body: { answers: chosen.map((r) => ({ id: r.id, type_id: r.type, value: r.value.trim() })) },
      });
      toast(`${saved} réponse${saved > 1 ? 's' : ''} ajoutée${saved > 1 ? 's' : ''}`, 'success');
      onSaved();
      onClose();
    } catch (e) { toast(e.message, 'error'); }
    saving = false;
  }
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onClose(); }} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
<div class="ws-overlay" role="dialog" aria-modal="true" aria-labelledby="ws-title" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
  <div class="ws">
    <header class="ws-head">
      <div class="ws-head-txt">
        <h2 id="ws-title">Films et séries</h2>
        <p class="ws-sub">Sur ces titres, c'est l'œuvre que les joueurs doivent trouver.</p>
      </div>
      <button class="ws-x" onclick={onClose} aria-label="Fermer">✕</button>
    </header>

    <div class="ws-body">
      {#if loading}
        <p class="ws-msg">On cherche les films de ta playlist… ça peut prendre une minute.</p>
      {:else if failed}
        <p class="ws-msg">Impossible de chercher pour l'instant.</p>
        <button class="btn-ghost" onclick={load}>Réessayer</button>
      {:else if !rows.length}
        <p class="ws-msg">Tous les titres ont déjà leur film ou leur série.</p>
      {:else}
        <p class="ws-msg">
          {found} proposition{found > 1 ? 's' : ''} sur {rows.length} titre{rows.length > 1 ? 's' : ''} sans œuvre.
          Corrige les noms, décoche ce qui n'est pas un film ou une série, puis enregistre.
        </p>
        {#if truncated}<p class="ws-msg">Grosse playlist : relance après l'enregistrement pour la suite.</p>{/if}
        <ul class="ws-list">
          {#each rows as r (r.id)}
            <li class="ws-row" class:off={!r.on}>
              <input type="checkbox" bind:checked={r.on} aria-label="Ajouter pour {r.title}">
              <div class="ws-song">
                <span class="ws-title" title={r.title}>{r.title}</span>
                <span class="ws-artist" title={r.artist}>{r.artist}</span>
              </div>
              <select bind:value={r.type} aria-label="Type pour {r.title}">
                {#each TYPES as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
              </select>
              <input class="ws-input" bind:value={r.value} maxlength="120" placeholder="Nom du film"
                aria-label="Œuvre de {r.title}" oninput={() => { if (r.value.trim()) r.on = true; }}>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <footer class="ws-foot">
      <button class="btn-ghost" onclick={onClose}>Annuler</button>
      <button class="btn-accent" onclick={save} disabled={saving || loading || !chosen.length}>
        {saving ? '...' : `Enregistrer${chosen.length ? ` (${chosen.length})` : ''}`}
      </button>
    </footer>
  </div>
</div>

<style>
  .ws-overlay {
    position: fixed; inset: 0; z-index: 700;
    display: flex; align-items: center; justify-content: center;
    padding: 20px; background: var(--overlay); backdrop-filter: blur(6px);
  }
  .ws {
    width: min(760px, 100%); max-height: min(820px, calc(100dvh - 40px));
    display: flex; flex-direction: column;
    background: var(--modal-bg); border: 1px solid var(--border2); border-radius: 16px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55); overflow: hidden;
  }
  .ws-head { display: flex; align-items: center; gap: 12px; padding: 16px 12px 14px 18px; border-bottom: 1px solid var(--border); }
  .ws-head-txt { flex: 1; min-width: 0; }
  .ws-head h2 { margin: 0; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); }
  .ws-sub { margin: 3px 0 0; font-weight: 700; font-size: 0.9rem; }
  .ws-x { width: 44px; height: 44px; border: none; background: none; color: var(--dim); font-size: 1rem; cursor: pointer; flex-shrink: 0; }
  .ws-x:hover { color: var(--text); }
  .ws-body { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; overscroll-behavior: contain; }
  .ws-msg { margin: 0; font-size: 0.8rem; color: var(--mid); }
  .ws-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .ws-row {
    display: grid; grid-template-columns: 24px minmax(0, 1fr) auto minmax(0, 1.2fr);
    align-items: center; gap: 10px; padding: 8px 10px;
    border: 1px solid var(--border); border-radius: 10px;
  }
  .ws-row.off { opacity: 0.55; }
  .ws-row input[type='checkbox'] { width: 20px; height: 20px; accent-color: var(--accent); }
  .ws-song { min-width: 0; display: flex; flex-direction: column; }
  .ws-title { font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ws-artist { font-size: 0.72rem; color: var(--mid); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ws-row select, .ws-input {
    min-height: 44px; padding: 6px 10px; border: 1px solid var(--border2); border-radius: 9px;
    background: rgb(var(--c-glass) / 0.04); color: var(--text); font: inherit; font-size: 0.85rem;
  }
  .ws-input { width: 100%; }
  .ws-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--border); }
  .ws-foot button { min-height: 44px; min-width: 110px; }
  @media (max-width: 600px) {
    .ws-overlay { padding: 0; align-items: flex-end; }
    .ws { max-height: 92dvh; border-radius: 16px 16px 0 0; }
    .ws-row { grid-template-columns: 24px minmax(0, 1fr) auto; }
    .ws-input { grid-column: 2 / -1; }
    .ws-foot button { flex: 1; }
  }
</style>
