<script>
  let { trackId, entries, types, token, onchange } = $props();

  let typeId = $state(3);
  let value = $state('');
  let target = $state('all');
  let busy = $state(false);
  let err = $state('');
  let arming = $state(null);

  const typeName = $derived(Object.fromEntries(types.map((t) => [t.id, t.name])));

  const groups = $derived.by(() => {
    const map = {};
    for (const e of entries) {
      for (const a of e.answers) {
        const key = `${a.answer_type_id}|${a.value.toLowerCase()}`;
        const g = (map[key] ??= { key, typeId: a.answer_type_id, value: a.value, ids: [], where: [] });
        g.ids.push(a.id);
        g.where.push(e.label);
      }
    }
    return Object.values(map).sort((a, b) => a.typeId - b.typeId || a.value.localeCompare(b.value));
  });

  async function call(method, body) {
    busy = true;
    err = '';
    try {
      const r = await fetch(`/api/admin/tracks-answers?token=${encodeURIComponent(token)}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId, ...body }),
      });
      const d = await r.json();
      if (!r.ok) {
        err = d.error || "L'enregistrement a échoué.";
        return false;
      }
      await onchange?.();
      return true;
    } catch {
      err = 'Le serveur est injoignable.';
      return false;
    } finally {
      busy = false;
    }
  }

  async function add(e) {
    e.preventDefault();
    const entryIds = target === 'all' ? entries.map((x) => x.id) : [target];
    if (await call('POST', { entryIds, typeId, value })) value = '';
  }

  function remove(g) {
    if (arming !== g.key) {
      arming = g.key;
      return;
    }
    arming = null;
    call('DELETE', { ids: g.ids });
  }
</script>

<div class="ta">
  {#if !entries.length}
    <p class="a-muted">Ce titre n'est dans aucune playlist : il n'y a pas de réponse à régler.</p>
  {:else}
    <p class="hint">
      En plus de l'artiste et du titre, les joueurs marquent aussi des points avec ces réponses
      (un film, une série, un personnage…).
    </p>
    {#if groups.length}
      <ul class="list">
        {#each groups as g (g.key)}
          <li>
            <em class="a-tag accent">{typeName[g.typeId] ?? '?'}</em>
            <span class="val">
              <b>{g.value}</b>
              {#if entries.length > 1}
                <small>{g.where.length === entries.length ? 'toutes les playlists' : g.where.join(', ')}</small>
              {/if}
            </span>
            <button
              class="a-btn small"
              class:danger={arming === g.key}
              type="button"
              disabled={busy}
              onclick={() => remove(g)}
              onblur={() => arming === g.key && (arming = null)}
            >
              {arming === g.key ? 'Confirmer' : 'Retirer'}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="a-muted">Aucune réponse alternative pour l'instant.</p>
    {/if}

    <form class="add" onsubmit={add}>
      <label class="a-label">
        Type
        <select class="a-select" bind:value={typeId}>
          {#each types as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
        </select>
      </label>
      <label class="a-label grow">
        Réponse acceptée
        <input class="a-input" bind:value placeholder="ex : Le Roi Lion" required />
      </label>
      {#if entries.length > 1}
        <label class="a-label grow">
          Dans
          <select class="a-select" bind:value={target}>
            <option value="all">Toutes les playlists ({entries.length})</option>
            {#each entries as e (e.id)}<option value={e.id}>{e.label}</option>{/each}
          </select>
        </label>
      {/if}
      <button class="a-btn primary" type="submit" disabled={busy || !value.trim()}>Ajouter</button>
    </form>
  {/if}
  {#if err}<p class="a-err">{err}</p>{/if}
</div>

<style>
  .ta { display: grid; gap: 12px; }
  .hint { font-size: 0.85rem; color: var(--a-muted); }
  .list { display: grid; gap: 6px; list-style: none; }
  .list li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid var(--a-line);
    border-radius: 10px;
    background: var(--a-bg);
  }
  .val { flex: 1; display: grid; min-width: 0; }
  .val b, .val small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .val small { font-size: 0.75rem; color: var(--a-dim); }
  .add { display: grid; gap: 10px; }
  @media (min-width: 700px) {
    .add { grid-template-columns: 150px 1fr auto; align-items: end; }
    .add:has(.grow + .grow) { grid-template-columns: 150px 1fr 1fr auto; }
  }
</style>
