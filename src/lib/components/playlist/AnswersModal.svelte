<script>
  import { toast } from '$lib/client/toast.svelte.js';
  import { coverThumb } from '$lib/shared/playlist/input.js';

  let { track, store, onClose } = $props();

  const EXTRA_TYPES = [
    { id: 3, name: 'Film' },
    { id: 4, name: 'Série' },
    { id: 5, name: 'Personnage' },
    { id: 6, name: 'Jeu vidéo' },
    { id: 7, name: 'Animé' },
  ];
  const typeName = (id) => EXTRA_TYPES.find((t) => t.id === id)?.name ?? '?';

  let loading = $state(true);
  let saving = $state(false);
  let defaults = $state({ artist: '', title: '', feats: [] });
  let artist = $state('');
  let title = $state('');
  let feats = $state([]);
  let featInput = $state('');
  let extras = $state([]);
  let extraType = $state(3);
  let extraInput = $state('');

  const featsChanged = $derived(feats.join('|') !== defaults.feats.join('|'));

  $effect(() => {
    if (!track) return;
    loading = true;
    featInput = ''; extraInput = '';
    store.api(`/api/playlists/tracks/${track.id}/answers`).then((d) => {
      defaults = { artist: d.default_artist ?? '', title: d.default_title ?? '', feats: d.default_feats ?? [] };
      artist = d.custom_artist ?? defaults.artist;
      title = d.custom_title ?? defaults.title;
      feats = [...(d.custom_feats ?? defaults.feats)];
      extras = (d.extra_answers || []).map((a) => ({ typeId: a.answer_type_id, value: a.value }));
      loading = false;
    }).catch((e) => { toast(e.message, 'error'); onClose(); });
  });

  function addFeat() {
    const v = featInput.trim();
    if (v && !feats.includes(v)) feats = [...feats, v];
    featInput = '';
  }

  function addExtra() {
    const v = extraInput.trim();
    if (v) extras = [...extras, { typeId: extraType, value: v }];
    extraInput = '';
  }

  // Valeur égale au défaut : on n'enregistre rien, le titre suit le catalogue.
  async function save() {
    if (featInput.trim()) addFeat();
    if (extraInput.trim()) addExtra();
    saving = true;
    try {
      await store.api(`/api/playlists/tracks/${track.id}/answers`, {
        method: 'PUT',
        body: {
          custom_artist: artist.trim() === defaults.artist ? null : artist,
          custom_title: title.trim() === defaults.title ? null : title,
          custom_feats: featsChanged ? feats : null,
          extra_answers: extras.map((a) => ({ type_id: a.typeId, value: a.value })),
        },
      });
      toast('Réponses enregistrées', 'success');
      onClose();
    } catch (e) { toast(e.message, 'error'); }
    saving = false;
  }
</script>

<svelte:window onkeydown={(e) => { if (track && e.key === 'Escape') onClose(); }} />

{#if track}
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
<div class="am-overlay" role="dialog" aria-modal="true" aria-labelledby="am-title" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
  <div class="am">
    <header class="am-head">
      {#if track.cover_url}<img class="am-cover" src={coverThumb(track.cover_url, 120)} alt="" width="52" height="52">{/if}
      <div class="am-head-txt">
        <h2 id="am-title">Réponses acceptées</h2>
        <p class="am-track" title="{track.artist} - {track.title}">{track.artist} - {track.title}</p>
      </div>
      <button class="am-x" onclick={onClose} aria-label="Fermer">✕</button>
    </header>

    <div class="am-body">
      {#if loading}
        <p class="am-msg">Chargement...</p>
      {:else}
        <p class="am-hint">Ce que les joueurs doivent taper pour marquer. Corrige si le nom officiel est trop long ou mal écrit.</p>

        <section class="am-card">
          <div class="am-label-row">
            <label class="am-label" for="am-artist">Artiste</label>
            {#if artist.trim() !== defaults.artist}<button class="am-reset" onclick={() => artist = defaults.artist}>↺ Rétablir</button>{/if}
          </div>
          <input id="am-artist" class="am-input" bind:value={artist} maxlength="100" placeholder={defaults.artist}>

          <div class="am-label-row">
            <span class="am-label">Featurings</span>
            {#if featsChanged}<button class="am-reset" onclick={() => feats = [...defaults.feats]}>↺ Rétablir</button>{/if}
          </div>
          <div class="am-chips">
            {#each feats as f (f)}
              <span class="am-chip">{f}<button onclick={() => feats = feats.filter((x) => x !== f)} aria-label="Retirer {f}">✕</button></span>
            {/each}
            <input class="am-chip-input" bind:value={featInput} maxlength="100" placeholder="+ feat, puis Entrée"
              aria-label="Ajouter un featuring" onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeat(); } }} onblur={addFeat}>
          </div>
        </section>

        <section class="am-card">
          <div class="am-label-row">
            <label class="am-label" for="am-title-in">Titre</label>
            {#if title.trim() !== defaults.title}<button class="am-reset" onclick={() => title = defaults.title}>↺ Rétablir</button>{/if}
          </div>
          <input id="am-title-in" class="am-input" bind:value={title} maxlength="100" placeholder={defaults.title}>
        </section>

        <section class="am-card">
          <span class="am-label">Réponses bonus <em>(générique de film, série, jeu...)</em></span>
          {#if extras.length}
            <ul class="am-extras">
              {#each extras as x, i (i)}
                <li><span class="am-extra-type">{typeName(x.typeId)}</span><span class="am-extra-val">{x.value}</span>
                  <button onclick={() => extras = extras.filter((_, k) => k !== i)} aria-label="Retirer {x.value}">✕</button></li>
              {/each}
            </ul>
          {/if}
          <div class="am-types" role="radiogroup" aria-label="Type de réponse bonus">
            {#each EXTRA_TYPES as t (t.id)}
              <button role="radio" aria-checked={extraType === t.id} class:on={extraType === t.id} onclick={() => extraType = t.id}>{t.name}</button>
            {/each}
          </div>
          <div class="am-add">
            <input class="am-input" bind:value={extraInput} maxlength="150" placeholder="Ex : Le Roi Lion" aria-label="Valeur de la réponse bonus"
              onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtra(); } }}>
            <button class="btn-ghost sm" onclick={addExtra} disabled={!extraInput.trim()}>Ajouter</button>
          </div>
        </section>
      {/if}
    </div>

    <footer class="am-foot">
      <button class="btn-ghost" onclick={onClose}>Annuler</button>
      <button class="btn-accent" onclick={save} disabled={saving || loading}>{saving ? '...' : 'Enregistrer'}</button>
    </footer>
  </div>
</div>
{/if}

<style>
  .am-overlay {
    position: fixed;
    inset: 0;
    z-index: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: var(--overlay);
    backdrop-filter: blur(6px);
  }
  .am {
    width: min(560px, 100%);
    max-height: min(760px, calc(100dvh - 40px));
    display: flex;
    flex-direction: column;
    background: var(--modal-bg);
    border: 1px solid var(--border2);
    border-radius: 16px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
    overflow: hidden;
  }
  .am-head { display: flex; align-items: center; gap: 12px; padding: 16px 12px 14px 18px; border-bottom: 1px solid var(--border); }
  .am-cover { width: 52px; height: 52px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
  .am-head-txt { flex: 1; min-width: 0; }
  .am-head h2 { margin: 0; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); }
  .am-track { margin: 3px 0 0; font-weight: 700; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .am-x { width: 44px; height: 44px; border: none; background: none; color: var(--dim); font-size: 1rem; cursor: pointer; flex-shrink: 0; }
  .am-x:hover { color: var(--text); }

  .am-body { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; overscroll-behavior: contain; }
  .am-msg { color: var(--mid); font-size: 0.82rem; }
  .am-hint { margin: 0; font-size: 0.76rem; color: var(--mid); }
  .am-card { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border: 1px solid var(--border); border-radius: 12px; background: rgb(var(--c-glass) / 0.02); }
  .am-label-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .am-label-row + .am-input + .am-label-row { margin-top: 6px; }
  .am-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
  .am-label em { font-style: normal; font-weight: 400; letter-spacing: 0; text-transform: none; }
  .am-reset { border: none; background: none; padding: 2px 0; color: var(--accent); font: inherit; font-size: 0.72rem; cursor: pointer; }
  .am-input {
    width: 100%;
    min-height: 42px;
    padding: 8px 12px;
    border: 1px solid var(--border2);
    border-radius: 9px;
    background: rgb(var(--c-glass) / 0.04);
    color: var(--text);
    font: inherit;
    font-size: 0.9rem;
    outline: none;
  }
  .am-input:focus, .am-chips:focus-within { border-color: rgb(var(--accent-rgb) / 0.5); }
  .am-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-height: 42px;
    padding: 6px;
    border: 1px solid var(--border2);
    border-radius: 9px;
    background: rgb(var(--c-glass) / 0.04);
  }
  .am-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 4px 3px 10px;
    border-radius: 999px;
    background: rgb(var(--accent-rgb) / 0.14);
    color: var(--text);
    font-size: 0.8rem;
  }
  .am-chip button, .am-extras button { width: 26px; height: 26px; border: none; border-radius: 50%; background: none; color: var(--dim); cursor: pointer; }
  .am-chip button:hover, .am-extras button:hover { color: var(--danger); }
  .am-chip-input { flex: 1; min-width: 140px; border: none; background: none; color: var(--text); font: inherit; font-size: 0.85rem; outline: none; padding: 4px 6px; }
  .am-extras { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .am-extras li { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
  .am-extra-type { flex-shrink: 0; padding: 2px 8px; border-radius: 6px; background: var(--surface2); font-size: 0.66rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--mid); }
  .am-extra-val { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .am-types { display: flex; flex-wrap: wrap; gap: 5px; }
  .am-types button {
    padding: 5px 11px;
    border: 1px solid var(--border2);
    border-radius: 999px;
    background: none;
    color: var(--mid);
    font: inherit;
    font-size: 0.74rem;
    cursor: pointer;
  }
  .am-types button.on { border-color: var(--accent); background: rgb(var(--accent-rgb) / 0.12); color: var(--accent); }
  .am-add { display: flex; gap: 8px; }
  .am-add .btn-ghost { flex-shrink: 0; min-height: 42px; }

  .am-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--border); }
  .am-foot button { min-height: 44px; min-width: 110px; }

  @media (max-width: 600px) {
    .am-overlay { padding: 0; align-items: flex-end; }
    .am { width: 100%; max-height: 92dvh; border-radius: 16px 16px 0 0; border-bottom: none; }
    .am-foot button { flex: 1; }
  }
</style>
