<script>
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';

  let { data, form } = $props();

  const TYPES = {
    correct_answers: { label: 'Bonnes réponses', unit: 'bonnes réponses', hint: 'Chaque bonne réponse en partie compte.' },
    games_played: { label: 'Parties jouées', unit: 'parties', hint: 'Chaque partie terminée par un joueur connecté compte.' },
    zikle_wins: { label: 'Zikle gagnés', unit: 'Zikle gagnés', hint: 'Chaque Zikle du jour trouvé compte.' },
  };

  const nf = (n) => (n ?? 0).toLocaleString('fr-FR');
  const day = (d, opts = { day: 'numeric', month: 'short' }) => new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', opts);
  const pctOf = (w) => (w.target ? Math.round((w.current_value / w.target) * 100) : 0);
  const DAY_MS = 86400_000;

  const cur = $derived(data.current);
  const progress = $derived(cur ? pctOf(cur) : 0);
  const elapsed = $derived(cur ? Math.round((Date.parse(data.today) - Date.parse(cur.week_start)) / DAY_MS) + 1 : 1);
  const daysLeft = $derived(8 - elapsed);
  const projection = $derived(cur ? Math.round((cur.current_value / elapsed) * 7) : 0);
  const onTrack = $derived(cur && (cur.current_value >= cur.target || projection >= cur.target));

  const closed = $derived(data.history.filter((w) => w.status !== 'active'));
  const wins = $derived(closed.filter((w) => w.status === 'success').length);
  const avgReached = $derived(closed.length ? Math.round(closed.reduce((s, w) => s + Math.min(pctOf(w), 100), 0) / closed.length) : 0);

  let editOpen = $state(false);
  let nextOpen = $state(false);
  let confirmCancel = $state(false);
  let busy = $state('');
  let fType = $state('');
  let fTarget = $state(0);

  function openEdit() {
    fType = cur.type;
    fTarget = cur.target;
    editOpen = true;
  }
  function openNext() {
    fType = data.next?.type ?? data.auto.type;
    fTarget = data.next?.target ?? data.suggestions[fType]?.target ?? data.auto.target;
    nextOpen = true;
  }

  const submit = (name) => () => {
    busy = name;
    return async ({ result, update }) => {
      await update({ reset: false });
      busy = '';
      if (result.type === 'success') {
        editOpen = false;
        nextOpen = false;
        confirmCancel = false;
      }
    };
  };
</script>

{#snippet fields()}
  {@const s = data.suggestions[fType]}
  <label class="a-label">
    Type de défi
    <select class="a-select" name="type" bind:value={fType}>
      {#each Object.entries(TYPES) as [k, t] (k)}<option value={k}>{t.label}</option>{/each}
    </select>
  </label>
  <p class="a-muted small">{TYPES[fType]?.hint}</p>
  <label class="a-label">
    Objectif ({TYPES[fType]?.unit})
    <input class="a-input" type="number" name="target" min="1" step="1" required bind:value={fTarget} />
  </label>
  {#if s}
    <div class="suggest">
      <span>
        Objectif réaliste : <b>{nf(s.target)}</b>
        <span class="a-muted">(les dernières semaines de ce type ont fait {s.basedOn.map(nf).join(', ')}, +20 %)</span>
      </span>
      {#if fTarget !== s.target}<button type="button" class="a-btn small" onclick={() => (fTarget = s.target)}>Utiliser</button>{/if}
    </div>
  {:else}
    <p class="a-muted small">Pas encore de semaine de ce type pour proposer un objectif.</p>
  {/if}
{/snippet}

<div class="adm-page">
  <PageHeader title="Défi de la semaine">
    <a class="a-btn small" href="/defi" target="_blank" rel="noopener">Voir sur le site</a>
  </PageHeader>

  <div class="a-stack">
    {#if !cur}
      <p class="a-card bad">Le défi de la semaine ne répond pas. Les tables du défi sont-elles bien en place ?</p>
    {:else}
      <div class="a-cols">
        <div>
          <section class="a-section hero" class:done={cur.current_value >= cur.target}>
            <div class="a-section-head">
              <h2>Cette semaine</h2>
              <span class="a-muted small">du {day(cur.week_start)} au {day(cur.week_end)}</span>
            </div>
            <div class="goal">
              <span class="a-tag accent">{TYPES[cur.type]?.label ?? cur.type}</span>
              <p class="count"><b class="a-big">{nf(cur.current_value)}</b> <span>/ {nf(cur.target)} {TYPES[cur.type]?.unit}</span></p>
            </div>
            <div class="a-meter big" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" aria-label="Progression du défi">
              <i class={progress >= 100 ? 'good' : onTrack ? '' : 'warn'} style:width="{Math.min(progress, 100)}%"></i>
            </div>
            <div class="facts">
              <div><b>{progress} %</b><span>atteint</span></div>
              <div><b>{daysLeft} j</b><span>{daysLeft > 1 ? 'restants' : 'restant'}, dimanche compris</span></div>
              <div><b>{nf(data.contributors.total)}</b><span>joueur{data.contributors.total > 1 ? 's' : ''} y participe{data.contributors.total > 1 ? 'nt' : ''}</span></div>
            </div>
            {#if cur.current_value >= cur.target}
              <p class="verdict good">Objectif atteint, bravo à la communauté.</p>
            {:else}
              <p class="verdict" class:good={onTrack} class:warn={!onTrack}>
                Au rythme actuel : environ <b>{nf(projection)}</b> dimanche soir.
                {onTrack ? 'Ça passe.' : `Il manque ${nf(cur.target - cur.current_value)}, l'objectif est sans doute trop haut.`}
              </p>
            {/if}
            <div class="a-btns">
              <button class="a-btn" type="button" onclick={openEdit}>Modifier ce défi</button>
            </div>
            {#if form?.currentSaved}
              <p class="a-ok">{form.currentSaved === 'reset' ? 'Défi changé : le compteur repart de zéro.' : 'Objectif mis à jour.'}</p>
            {/if}
          </section>

          <section class="a-section">
            <div class="a-section-head"><h2>Meilleurs contributeurs</h2></div>
            <ol class="a-list">
              {#each data.contributors.top as c, i (c.user_id)}
                <li>
                  <a class="a-row" href="/admin/users/{c.user_id}">
                    <span class="rank" class:gold={i === 0}>{i + 1}</span>
                    {#if c.profiles?.avatar_url}<img class="a-avatar" src={c.profiles.avatar_url} alt="" />{:else}<span class="a-avatar"></span>{/if}
                    <span class="a-row-main"><span class="a-row-title">{c.profiles?.username ?? 'Joueur supprimé'}</span></span>
                    <b class="amount">{nf(c.amount)}</b>
                  </a>
                </li>
              {:else}
                <li class="a-empty">Personne n'a encore contribué cette semaine.</li>
              {/each}
            </ol>
          </section>
        </div>

        <div>
          <section class="a-section">
            <div class="a-section-head">
              <h2>Semaine prochaine</h2>
              <span class="a-muted small">dès le {day(data.nextMonday)}</span>
            </div>
            {#if data.next}
              <div class="next">
                <em class="a-tag good">Programmé</em>
                <b>{TYPES[data.next.type]?.label}</b>
                <span>Objectif : {nf(data.next.target)} {TYPES[data.next.type]?.unit}</span>
              </div>
              {#if confirmCancel}
                <form method="POST" action="?/cancelNext" class="a-btns" use:enhance={submit('cancel')}>
                  <button class="a-btn danger" type="submit" disabled={busy === 'cancel'}>Oui, revenir au choix automatique</button>
                  <button class="a-btn" type="button" onclick={() => (confirmCancel = false)}>Non</button>
                </form>
              {:else}
                <div class="a-btns">
                  <button class="a-btn primary" type="button" onclick={openNext}>Modifier</button>
                  <button class="a-btn" type="button" onclick={() => (confirmCancel = true)}>Annuler</button>
                </div>
              {/if}
            {:else}
              <div class="next">
                <em class="a-tag">Automatique</em>
                <b>{TYPES[data.auto.type]?.label}</b>
                <span>Objectif par défaut : {nf(data.auto.target)} {TYPES[data.auto.type]?.unit}</span>
              </div>
              {#if data.suggestions[data.auto.type] && data.suggestions[data.auto.type].target < data.auto.target}
                <p class="a-card warn small">L'objectif par défaut est bien au-dessus de ce que fait la communauté ({nf(data.suggestions[data.auto.type].target)} serait réaliste). Programme la semaine pour l'ajuster.</p>
              {/if}
              <button class="a-btn primary" type="button" onclick={openNext}>Programmer la semaine prochaine</button>
            {/if}
            {#if form?.nextSaved}<p class="a-ok">Semaine prochaine programmée.</p>{/if}
            {#if form?.nextCanceled}<p class="a-ok">Retour au choix automatique.</p>{/if}
            {#if form?.nextError && !nextOpen}<p class="a-err">{form.nextError}</p>{/if}
          </section>

          <div class="a-grid2">
            <div class="a-kpi">
              <span class="a-kpi-label">Semaines réussies</span>
              <span class="a-kpi-value">{wins}/{closed.length}</span>
            </div>
            <div class="a-kpi">
              <span class="a-kpi-label">Atteint en moyenne</span>
              <span class="a-kpi-value">{avgReached} %</span>
            </div>
          </div>
        </div>
      </div>

      <h2 class="a-h2">Semaines passées</h2>
      <ul class="a-list hist">
        {#each data.history as w (w.id)}
          {@const p = pctOf(w)}
          <li class="a-row week">
            <span class="when">{day(w.week_start)}<small>→ {day(w.week_end)}</small></span>
            <span class="a-row-main">
              <span class="a-row-title">{TYPES[w.type]?.label ?? w.type}</span>
              <span class="a-row-sub">
                {nf(w.current_value)} / {nf(w.target)}
                {#if w.top_contributor}· meneur : <a href="/admin/users/{w.top_contributor.id}">{w.top_contributor.username}</a> ({nf(w.top_contributor_amount)}){/if}
              </span>
            </span>
            <span class="pct">
              <span class="a-meter"><i class={w.status === 'success' ? 'good' : 'bad'} style:width="{Math.min(p, 100)}%"></i></span>
              <b>{p} %</b>
            </span>
            {#if w.status === 'success'}
              <em class="a-tag good">Réussi</em>
            {:else if w.status === 'failed'}
              <em class="a-tag bad">Raté</em>
            {:else}
              <em class="a-tag warn">Pas encore clos</em>
            {/if}
          </li>
        {:else}
          <li class="a-empty">Aucune semaine terminée pour l'instant.</li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<Sheet bind:open={editOpen} title="Modifier le défi en cours">
  <form method="POST" action="?/editCurrent" class="a-form" use:enhance={submit('edit')}>
    <input type="hidden" name="id" value={cur?.id} />
    {@render fields()}
    {#if cur && fType !== cur.type}
      <p class="a-card warn small">Changer le type remet le compteur à zéro : les {nf(cur.current_value)} {TYPES[cur.type]?.unit} déjà comptés et le classement de la semaine seront effacés.</p>
    {/if}
    <button class="a-btn primary" type="submit" disabled={busy === 'edit'}>
      {busy === 'edit' ? 'Enregistrement…' : cur && fType !== cur.type ? 'Changer et repartir de zéro' : 'Enregistrer'}
    </button>
    {#if form?.currentError}<p class="a-err">{form.currentError}</p>{/if}
  </form>
</Sheet>

<Sheet bind:open={nextOpen} title="Semaine du {day(data.nextMonday)}">
  <form method="POST" action="?/scheduleNext" class="a-form" use:enhance={submit('next')}>
    <p class="a-muted small">Le défi démarrera tout seul lundi. Sans programmation, le site choisit le type suivant dans la rotation avec l'objectif par défaut.</p>
    {@render fields()}
    <button class="a-btn primary" type="submit" disabled={busy === 'next'}>{busy === 'next' ? 'Enregistrement…' : 'Programmer'}</button>
    {#if form?.nextError}<p class="a-err">{form.nextError}</p>{/if}
  </form>
</Sheet>

<style>
  .small { font-size: 0.82rem; }
  .hero { background: linear-gradient(160deg, var(--a-accent-soft), var(--a-surface) 60%); }
  .hero.done { background: linear-gradient(160deg, var(--a-good-soft), var(--a-surface) 60%); }
  .goal { display: grid; gap: 8px; justify-items: start; }
  .count { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; color: var(--a-muted); }
  .count .a-big { font-size: 2.8rem; }
  .a-meter.big { height: 14px; }
  .facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .facts div { display: grid; gap: 2px; }
  .facts b { font-family: var(--a-display); font-size: 1.4rem; }
  .facts span { font-size: 0.75rem; color: var(--a-dim); }
  .verdict { padding: 10px 12px; border-radius: 10px; background: var(--a-surface2); font-size: 0.88rem; }
  .verdict.good { background: var(--a-good-soft); color: var(--a-good); }
  .verdict.warn { background: var(--a-warn-soft); color: var(--a-warn); }
  .rank { width: 24px; text-align: center; font-family: var(--a-display); font-size: 1.2rem; font-weight: 800; color: var(--a-dim); }
  .rank.gold { color: var(--a-warn); }
  span.a-avatar { display: inline-block; }
  .amount { font-variant-numeric: tabular-nums; }
  .next { display: grid; gap: 4px; justify-items: start; }
  .next b { font-size: 1.1rem; }
  .next span { font-size: 0.88rem; color: var(--a-muted); }
  .suggest { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 10px; background: var(--a-good-soft); font-size: 0.85rem; }
  .suggest b { color: var(--a-good); }
  .when { display: grid; min-width: 58px; font-weight: 700; font-size: 0.88rem; }
  .when small { font-weight: 400; color: var(--a-dim); }
  .a-row-sub a { color: var(--a-cyan); }
  .pct { display: grid; align-items: center; gap: 8px; text-align: right; font-size: 0.88rem; font-variant-numeric: tabular-nums; }
  .pct .a-meter { display: none; }
  @media (min-width: 700px) {
    .pct { grid-template-columns: 120px 44px; }
    .pct .a-meter { display: block; }
  }
</style>
