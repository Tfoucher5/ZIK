<script>
  import { onMount } from 'svelte';
  import { parseList } from '$lib/shared/playlist/input.js';
  import { player } from './previewPlayer.svelte.js';
  import { toast } from '$lib/client/toast.svelte.js';

  let { initialText = '', store, onClose } = $props();

  // svelte-ignore state_referenced_locally
  let text = $state(initialText);
  let rows = $state(null);
  let loading = $state(false);
  let adding = $state(false);

  const PLACEHOLDER = 'Daft Punk - One More Time\nStromae - Alors on danse\n...';
  const STATUS = { ok: ['✓', 'Trouvé'], doubt: ['?', 'À vérifier'], none: ['✕', 'Introuvable'] };

  const chosen = $derived((rows ?? []).filter((r) => r.include).map(pickOf).filter((t) => t && !store.find(t)));
  const counts = $derived((rows ?? []).reduce((c, r) => ({ ...c, [r.status]: (c[r.status] || 0) + 1 }), {}));

  function pickOf(r) {
    if (r.pick >= 0) return r.picks[r.pick];
    return r.artist && r.title ? { artist: r.artist, title: r.title, source: 'manual' } : null;
  }

  onMount(() => { if (text.trim()) analyze(); });

  async function analyze() {
    const parsed = parseList(text);
    if (!parsed.length) return;
    loading = true;
    try {
      const r = await fetch('/api/deezer/match', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lines: parsed.map((p) => p.query) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || data.message || `HTTP ${r.status}`);
      rows = data.map((m) => ({ ...m, pick: m.picks.length ? 0 : -1, include: m.status !== 'none' }));
    } catch (e) { toast(e.message, 'error'); }
    loading = false;
  }

  async function addAll() {
    adding = true;
    const n = await store.addBatch(chosen);
    adding = false;
    if (n) { toast(`${n} titre${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''}`, 'success'); onClose(); }
  }
</script>

<div class="px">
  <div class="px-head">
    <h3>Coller une liste</h3>
    <button class="px-close" onclick={onClose} aria-label="Fermer le collage">✕</button>
  </div>

  {#if !rows}
    <label class="px-hint" for="px-text">Une ligne par titre, « Artiste - Titre » de préférence (numéros et durées sont ignorés). 100 lignes max.</label>
    <textarea id="px-text" class="input-glass px-text" rows="9" bind:value={text}
      placeholder={PLACEHOLDER}></textarea>
    <button class="btn-accent" onclick={analyze} disabled={loading || !text.trim()}>
      {loading ? 'Recherche des titres...' : 'Trouver les titres'}
    </button>
  {:else}
    <p class="px-sum">
      {#each Object.entries(STATUS) as [k, [, label]] (k)}
        {#if counts[k]}<span class="px-st {k}">{counts[k]} {label.toLowerCase()}</span>{/if}
      {/each}
    </p>
    <ul class="px-rows">
      {#each rows as r, i (i)}
        {@const t = pickOf(r)}
        <li class="px-row" class:off={!r.include}>
          <input type="checkbox" bind:checked={r.include} disabled={!t} aria-label="Inclure {r.line}">
          <span class="px-icon {r.status}" title={STATUS[r.status][1]}>{STATUS[r.status][0]}</span>
          <div class="px-info">
            {#if r.picks.length > 1}
              <select class="px-select" bind:value={r.pick} aria-label="Titre trouvé pour {r.line}">
                {#each r.picks as p, j (p.external_id)}<option value={j}>{p.artist} - {p.title}</option>{/each}
              </select>
            {:else if t}
              <span class="px-track">{t.artist} - {t.title}{#if r.pick < 0} <em>(sans Deezer)</em>{/if}</span>
            {:else}
              <span class="px-track px-none">Introuvable</span>
            {/if}
            <span class="px-line" title={r.line}>{r.line}</span>
          </div>
          {#if t?.preview_url}
            <button class="px-play" onclick={() => player.toggle(`dz:${t.external_id}`, t.preview_url)}
              aria-label="Écouter {t.title}">{player.current === `dz:${t.external_id}` ? '■' : '▶'}</button>
          {/if}
        </li>
      {/each}
    </ul>
    <div class="px-foot">
      <button class="btn-ghost sm" onclick={() => rows = null}>Modifier la liste</button>
      <button class="btn-accent sm" onclick={addAll} disabled={adding || !chosen.length}>
        {adding ? '...' : `Ajouter ${chosen.length} titre${chosen.length > 1 ? 's' : ''}`}
      </button>
    </div>
  {/if}
</div>

<style>
  .px { display: flex; flex-direction: column; gap: 10px; padding: 0 8px; }
  .px-head { display: flex; align-items: center; justify-content: space-between; }
  .px-head h3 { margin: 0; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); }
  .px-close { width: 36px; height: 36px; border: none; background: none; color: var(--dim); cursor: pointer; }
  .px-close:hover { color: var(--text); }
  .px-hint { font-size: 0.76rem; color: var(--mid); }
  .px-text { font: inherit; font-size: 0.84rem; resize: vertical; min-height: 160px; }
  .px-sum { display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.74rem; margin: 0; }
  .px-st.ok, .px-icon.ok { color: var(--success); }
  .px-st.doubt, .px-icon.doubt { color: var(--gold); }
  .px-st.none, .px-icon.none { color: var(--danger); }
  .px-rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .px-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border); }
  .px-row.off .px-info { opacity: 0.45; }
  .px-row input { accent-color: var(--accent); width: 18px; height: 18px; flex-shrink: 0; }
  .px-icon { width: 16px; text-align: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
  .px-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .px-track, .px-line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .px-track { font-size: 0.82rem; font-weight: 600; }
  .px-track em { font-weight: 400; color: var(--dim); }
  .px-none { color: var(--dim); font-weight: 400; }
  .px-line { font-size: 0.68rem; color: var(--dim); }
  .px-select {
    max-width: 100%;
    background: var(--surface);
    border: 1px solid var(--border2);
    border-radius: 6px;
    color: var(--text);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 3px 6px;
  }
  .px-select option { background-color: var(--bg2); color: var(--text); }
  .px-play { width: 34px; height: 34px; flex-shrink: 0; border: none; border-radius: 50%; background: none; color: var(--text); cursor: pointer; }
  .px-play:hover { background: var(--surface2); }
  .px-foot {
    position: sticky;
    bottom: 0;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 0;
    background: var(--bg);
  }
</style>
