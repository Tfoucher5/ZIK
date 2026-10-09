<script>
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import { ago, pct } from '$lib/admin/stats-utils.js';

  let { data, form } = $props();

  const CATEGORIES = { streak: 'Séries', wins: 'Victoires', score: 'Score', social: 'Social', challenge: 'Défi de la semaine' };
  const RARITIES = { common: 'Commun', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire' };
  const RARITY_TAG = { common: '', rare: 'good', epic: 'accent', legendary: 'warn' };
  const LEVELS = { bronze: 'Bronze', silver: 'Argent', gold: 'Or' };
  const dec = (n) => String(n).replace('.', ',');

  const share = (a) => pct(a.holders, data.players);
  const sorted = $derived(data.achievements.toSorted((a, b) => a.holders - b.holders || a.name.localeCompare(b.name)));
  const rarest = $derived(sorted.filter((a) => a.holders > 0).slice(0, 3));
  const never = $derived(sorted.filter((a) => a.holders === 0));

  let cat = $state('all');
  const shown = $derived(cat === 'all' ? sorted : sorted.filter((a) => a.category === cat));
  const catCounts = $derived(Object.fromEntries(Object.keys(CATEGORIES).map((c) => [c, data.achievements.filter((a) => a.category === c).length])));

  let defOpen = $state(false);
  let def = $state(null);
  let confirmDelete = $state(false);
  let grantOpen = $state(false);
  let grantId = $state('');
  let revokeOpen = $state(false);
  let toRevoke = $state(null);
  let busy = $state('');

  const grantDef = $derived(data.achievements.find((a) => a.id === grantId));

  function openCreate() {
    def = {
      mode: 'create', id: '', name: '', description: '', icon: '🏅', type: 'one_time', rarity: 'common', category: 'wins',
      tiers: [{ level: 'bronze', target: 10, rarity: 'common' }, { level: 'silver', target: 50, rarity: 'rare' }, { level: 'gold', target: 200, rarity: 'epic' }],
    };
    confirmDelete = false;
    defOpen = true;
  }
  function openEdit(a) {
    def = { ...a, mode: 'edit', tiers: (a.tiers ?? []).map((t) => ({ ...t })) };
    confirmDelete = false;
    defOpen = true;
  }
  function openGrant(id = data.achievements[0]?.id ?? '') {
    grantId = id;
    grantOpen = true;
  }

  const submit = (name) => () => {
    busy = name;
    return async ({ result, update }) => {
      await update({ reset: false });
      busy = '';
      if (result.type === 'success') {
        defOpen = false;
        grantOpen = false;
        revokeOpen = false;
      }
    };
  };
</script>

<div class="adm-page">
  <PageHeader title="Succès">
    <button class="a-btn small primary" type="button" onclick={openCreate}>Nouveau</button>
  </PageHeader>

  <div class="a-stack">
    {#if form?.done}<p class="a-card good">{form.done}</p>{/if}
    {#if form?.error}<p class="a-card bad">{form.error}</p>{/if}
    {#if data.error}<p class="a-card bad">{data.error}</p>{/if}

    <div class="a-kpis">
      <div class="a-kpi"><span class="a-kpi-label">Succès à débloquer</span><span class="a-kpi-value">{data.achievements.length}</span></div>
      <div class="a-kpi">
        <span class="a-kpi-label">Joueurs avec au moins un succès</span>
        <span class="a-kpi-value">{dec(pct(data.playersWithBadge, data.players))} %</span>
        <span class="a-kpi-sub">{data.playersWithBadge} sur {data.players} inscrits</span>
      </div>
      <div class="a-kpi"><span class="a-kpi-label">Succès débloqués</span><span class="a-kpi-value">{data.totalUnlocks}</span><span class="a-kpi-sub">paliers compris</span></div>
    </div>

    {#if rarest.length}
      <h2 class="a-h2">Les plus rares</h2>
      <div class="rare-grid">
        {#each rarest as a, i (a.id)}
          <button class="a-card rare" class:first={i === 0} type="button" onclick={() => openEdit(a)}>
            <span class="r-icon">{a.icon}</span>
            <span class="r-txt">
              <b>{a.name}</b>
              <span>{a.holders} joueur{a.holders > 1 ? 's' : ''} · {dec(share(a))} %</span>
            </span>
          </button>
        {/each}
      </div>
      {#if never.length}
        <p class="a-muted small">Jamais obtenus : {never.map((a) => `${a.icon} ${a.name}`).join(', ')}.</p>
      {/if}
    {/if}

    <h2 class="a-h2">Tous les succès</h2>
    <div class="a-chips" role="group" aria-label="Catégorie">
      <button class="a-chip" aria-pressed={cat === 'all'} onclick={() => (cat = 'all')}>Tous<b>{data.achievements.length}</b></button>
      {#each Object.entries(CATEGORIES) as [k, label] (k)}
        {#if catCounts[k]}
          <button class="a-chip" aria-pressed={cat === k} onclick={() => (cat = k)}>{label}<b>{catCounts[k]}</b></button>
        {/if}
      {/each}
    </div>
    <p class="a-muted small">Du plus rare au plus courant. Touche un succès pour le modifier.</p>
    <ul class="a-list cat">
      {#each shown as a (a.id)}
        <li>
          <button class="a-row" type="button" onclick={() => openEdit(a)}>
            <span class="icon">{a.icon}</span>
            <span class="a-row-main">
              <span class="a-row-title">{a.name}</span>
              <span class="a-row-sub">{a.description || '—'}</span>
              <span class="tags">
                <em class="a-tag {RARITY_TAG[a.rarity]}">{RARITIES[a.rarity] ?? a.rarity}</em>
                <em class="a-tag">{CATEGORIES[a.category] ?? a.category}</em>
                {#if a.type === 'tiered'}<em class="a-tag">Paliers</em>{/if}
              </span>
            </span>
            <span class="own">
              <b>{dec(share(a))} %</b>
              <span class="a-meter"><i style:width="{Math.min(100, share(a))}%"></i></span>
              <small>{a.holders} joueur{a.holders > 1 ? 's' : ''}</small>
            </span>
          </button>
        </li>
      {:else}
        <li class="a-empty">Aucun succès.</li>
      {/each}
    </ul>

    <div class="a-section-head">
      <h2 class="a-h2">Derniers débloqués</h2>
      <button class="a-btn small" type="button" onclick={() => openGrant()}>Attribuer à un joueur</button>
    </div>
    <ul class="a-list">
      {#each data.unlocks as u (u.id)}
        <li class="a-row">
          <span class="icon">{u.achievements?.icon}</span>
          <span class="a-row-main">
            <span class="a-row-title">
              <a href="/admin/users/{u.user_id}">{u.profiles?.username ?? 'Joueur supprimé'}</a>
            </span>
            <span class="a-row-sub">
              {u.achievements?.name ?? u.achievement_id}{u.tier ? ` · ${LEVELS[u.tier] ?? u.tier}` : ''}{u.count > 1 ? ` · ×${u.count}` : ''} · {ago(u.unlocked_at)}
            </span>
          </span>
          <button class="a-btn small" type="button" onclick={() => { toRevoke = u; revokeOpen = true; }}>Retirer</button>
        </li>
      {:else}
        <li class="a-empty">Aucun succès débloqué.</li>
      {/each}
    </ul>
  </div>
</div>

<Sheet bind:open={defOpen} title={def?.mode === 'create' ? 'Nouveau succès' : 'Modifier le succès'} wide>
  {#if def}
    {#if def.mode === 'edit'}
      <p class="a-muted small owners">
        {def.holders} joueur{def.holders > 1 ? 's' : ''} l'ont ({dec(share(def))} %)
        {#if def.type === 'tiered'}· {def.tiers.map((t) => `${LEVELS[t.level] ?? t.level} : ${def.tierHolders?.[t.level] ?? 0}`).join(' · ')}{/if}
      </p>
    {/if}
    <form method="POST" action={def.mode === 'create' ? '?/createAchievement' : '?/editAchievement'} class="a-form" use:enhance={submit('def')}>
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
      {#if form?.defError}<p class="a-err">{form.defError}</p>{/if}
    </form>

    {#if def.mode === 'edit'}
      <div class="a-btns side-actions">
        <button class="a-btn" type="button" onclick={() => { defOpen = false; openGrant(def.id); }}>Attribuer à un joueur</button>
        {#if confirmDelete}
          <form method="POST" action="?/deleteAchievement" use:enhance={submit('delete')}>
            <input type="hidden" name="id" value={def.id} />
            <button class="a-btn danger" type="submit" disabled={busy === 'delete'}>
              Confirmer{def.holders ? ` (retiré à ${def.holders} joueur${def.holders > 1 ? 's' : ''})` : ''}
            </button>
          </form>
        {:else}
          <button class="a-btn danger" type="button" onclick={() => (confirmDelete = true)}>Supprimer ce succès</button>
        {/if}
      </div>
    {/if}
  {/if}
</Sheet>

<Sheet bind:open={grantOpen} title="Attribuer un succès">
  <form method="POST" action="?/grantUnlock" class="a-form" use:enhance={submit('grant')}>
    <label class="a-label">Pseudo du joueur<input class="a-input" name="username" required autocomplete="off" /></label>
    <label class="a-label">Succès
      <select class="a-select" name="achievement_id" bind:value={grantId}>
        {#each data.achievements as a (a.id)}<option value={a.id}>{a.icon} {a.name}</option>{/each}
      </select>
    </label>
    {#if grantDef?.type === 'tiered'}
      <label class="a-label">Palier
        <select class="a-select" name="tier">
          {#each grantDef.tiers ?? [] as t (t.level)}<option value={t.level}>{LEVELS[t.level] ?? t.level}</option>{/each}
        </select>
      </label>
    {/if}
    <button class="a-btn primary" type="submit" disabled={busy === 'grant'}>Attribuer</button>
    {#if form?.grantError}<p class="a-err">{form.grantError}</p>{/if}
  </form>
</Sheet>

<Sheet bind:open={revokeOpen} title="Retirer un succès">
  {#if toRevoke}
    <p>Retirer <b>{toRevoke.achievements?.icon} {toRevoke.achievements?.name}</b>{toRevoke.tier ? ` (${LEVELS[toRevoke.tier] ?? toRevoke.tier})` : ''} à <b>{toRevoke.profiles?.username ?? 'ce joueur'}</b> ?</p>
    <form method="POST" action="?/revokeUnlock" class="a-btns confirm" use:enhance={submit('revoke')}>
      <input type="hidden" name="id" value={toRevoke.id} />
      <button class="a-btn danger" type="submit" disabled={busy === 'revoke'}>Retirer</button>
    </form>
  {/if}
</Sheet>

<style>
  .small { font-size: 0.82rem; }
  .rare-grid { display: grid; gap: 10px; }
  @media (min-width: 700px) { .rare-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .rare { display: flex; align-items: center; gap: 12px; color: var(--a-fg); font: inherit; text-align: left; cursor: pointer; background: linear-gradient(150deg, var(--a-violet-soft, var(--a-accent-soft)), var(--a-surface) 70%); }
  .rare.first { border-color: var(--a-warn); background: linear-gradient(150deg, var(--a-warn-soft), var(--a-surface) 70%); }
  .rare:hover { border-color: var(--a-dim); }
  .r-icon { font-size: 2.2rem; line-height: 1; }
  .r-txt { display: grid; gap: 2px; min-width: 0; }
  .r-txt b { font-family: var(--a-display); font-size: 1.25rem; }
  .r-txt span { font-size: 0.8rem; color: var(--a-muted); }

  .icon { flex: 0 0 auto; width: 36px; font-size: 1.6rem; text-align: center; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
  .own { display: grid; justify-items: end; gap: 4px; width: 84px; flex: 0 0 auto; font-variant-numeric: tabular-nums; }
  .own .a-meter { width: 100%; }
  .own small { font-size: 0.72rem; color: var(--a-dim); }
  @media (min-width: 900px) {
    .cat { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .own { width: 120px; }
  }
  .a-row-title a { color: var(--a-fg); }
  .a-row-title a:hover { color: var(--a-accent); }

  .owners { margin-bottom: 12px; }
  .icon-field { max-width: 110px; }
  .tiers { display: grid; gap: 8px; border: 0; }
  .tier { display: grid; grid-template-columns: 1fr 90px 1fr auto; gap: 6px; align-items: center; }
  .side-actions { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--a-line); }
  .side-actions form { display: contents; }
  .confirm { margin-top: 14px; }
  code { font-family: 'JetBrains Mono', monospace; }
</style>
