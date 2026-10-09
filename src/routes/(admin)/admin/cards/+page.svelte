<script>
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import { ago, pct } from '$lib/admin/stats-utils.js';
  import { RARITIES, RARITY_ORDER } from '$lib/components/card/rarity.js';
  import { GRANT_STATUSES, SIGNAL_REASONS, SET_KINDS, popularity, seconds, signalDetail } from '$lib/admin/cartes.js';

  let { data, form } = $props();

  let busy = $state(false);
  let confirm = $state(null);
  let confirmOpen = $state(false);
  let fixing = $state(null);
  let fixOpen = $state(false);

  let search = $state(page.url.searchParams.get('q') ?? '');
  let who = $state(page.url.searchParams.get('who') ?? '');

  const catalog = $derived(data.stats.rarity.reduce((s, r) => s + r.catalog, 0));
  const todo = $derived(data.stats.reports + data.stats.signals);
  const nf = (n) => (n ?? 0).toLocaleString('fr-FR');
  const plural = (n, word) => `${nf(n)} ${word}${n > 1 ? 's' : ''}`;
  const STATUS_TONE = { pending: 'warn', granted: 'good', lost: '', revoked: 'bad' };

  function href(changes) {
    const p = new SvelteURLSearchParams(page.url.searchParams);
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, String(v));
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `?${s}` : page.url.pathname;
  }

  const go = (changes) => goto(href(changes), { keepFocus: true, noScroll: true });

  function ask(action, fields, title, text) {
    confirm = { action, fields, title, text };
    confirmOpen = true;
  }

  function fix(card, reportId = null) {
    fixing = { card, reportId };
    fixOpen = true;
  }

  function submitting() {
    busy = true;
    return async ({ result, update }) => {
      busy = false;
      if (result.type === 'success' && result.data?.success) {
        confirmOpen = false;
        fixOpen = false;
        if (result.data.corrected && data.cardNumber) await go({ card: null });
      }
      await update({ reset: false });
    };
  }
</script>

<div class="adm-page">
  <PageHeader title="Cartes" />

  <div class="a-stack">
    {#if form?.message}<p class="a-card good flash">{form.message}</p>{/if}
    {#if form?.error && !fixOpen}<p class="a-card bad flash">{form.error}</p>{/if}

    <div class="a-kpis">
      <div class="a-kpi">
        <span class="a-kpi-label">Cartes en circulation</span>
        <span class="a-kpi-value">{nf(data.stats.owned)}</span>
        <span class="a-kpi-sub">{nf(catalog)} au catalogue · {nf(data.stats.sets)} sets</span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Gains en attente</span>
        <span class="a-kpi-value">{nf(data.stats.grants.pending)}</span>
        <span class="a-kpi-sub">{nf(data.stats.grants.granted)} déjà données</span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Gains retirés</span>
        <span class="a-kpi-value">{nf(data.stats.grants.revoked)}</span>
        <span class="a-kpi-sub">{nf(data.stats.grants.lost)} perdues en jeu</span>
      </div>
      <a class="a-kpi" class:hot={data.stats.signals} href="#a-traiter">
        <span class="a-kpi-label">Signaux de triche</span>
        <span class="a-kpi-value">{nf(data.stats.signals)}</span>
        <span class="a-kpi-sub">à revoir</span>
      </a>
      <a class="a-kpi" class:hot={data.stats.reports} href="#a-traiter">
        <span class="a-kpi-label">Cartes signalées</span>
        <span class="a-kpi-value">{nf(data.stats.reports)}</span>
        <span class="a-kpi-sub">par les joueurs</span>
      </a>
    </div>

    <div class="a-cols">
      <div>
        <section class="a-section" id="a-traiter">
          <div class="a-section-head">
            <h2>À traiter</h2>
            {#if todo}<em class="a-tag warn">{todo}</em>{/if}
          </div>

          {#if !todo}
            <p class="a-ok">Rien à traiter : aucune carte signalée, aucun signal de triche.</p>
          {/if}

          {#if data.reports.length}
            <h3 class="sub">Cartes signalées par les joueurs</h3>
            <ul class="a-list">
              {#each data.reports as r (r.id)}
                <li class="item">
                  <div class="item-main">
                    {#if r.card}
                      <span class="card-name"><i class="dot" data-r={r.card.rarity}></i><b>{r.card.title}</b> <span class="a-muted">· {r.card.artist}</span></span>
                    {:else}
                      <span class="a-muted">Carte n° {r.metadata?.card} déjà supprimée</span>
                    {/if}
                    {#if r.message}<q>{r.message}</q>{/if}
                    <span class="a-row-sub">{ago(r.created_at)}{r.card ? ` · carte n° ${r.card.number}` : ''}</span>
                  </div>
                  <div class="a-btns">
                    {#if r.card}
                      <button class="a-btn small primary" type="button" onclick={() => fix(r.card, r.id)}>Corriger</button>
                      <a class="a-btn small" href={href({ card: r.card.number })}>Voir la carte</a>
                    {/if}
                    <form method="POST" action="?/dismissReport" use:enhance={submitting}>
                      <input type="hidden" name="id" value={r.id} />
                      <button class="a-btn small" disabled={busy}>Classer</button>
                    </form>
                  </div>
                </li>
              {/each}
            </ul>
          {/if}

          {#if data.signals.length}
            <h3 class="sub">Gains suspects</h3>
            <ul class="a-list">
              {#each data.signals as s (s.id)}
                {@const card = s.card_grants?.cards}
                <li class="item">
                  <div class="item-main">
                    <span><a class="who" href="/admin/users/{s.user_id}">{s.username ?? 'Joueur inconnu'}</a> · {SIGNAL_REASONS[s.reason] ?? s.reason} <span class="a-muted">{signalDetail(s)}</span></span>
                    {#if card}<span class="card-name"><i class="dot" data-r={card.rarity}></i>{card.title} <span class="a-muted">· {card.artist}</span></span>{/if}
                    <span class="a-row-sub">{ago(s.created_at)}{s.card_grants?.status === 'revoked' ? ' · carte déjà retirée' : ''}</span>
                  </div>
                  <div class="a-btns">
                    <form method="POST" action="?/reviewSignal" use:enhance={submitting}>
                      <input type="hidden" name="id" value={s.id} />
                      <button class="a-btn small good" disabled={busy}>Vu, rien à signaler</button>
                    </form>
                    {#if s.grant_id && s.card_grants?.status !== 'revoked'}
                      <button class="a-btn small danger" type="button" onclick={() => ask('revokeGrant', { id: s.grant_id }, 'Retirer cette carte ?', `« ${card?.title} » quitte la collection de ${s.username ?? 'ce joueur'}.`)}>Retirer la carte</button>
                    {/if}
                    <a class="a-btn small" href={href({ user: s.user_id, who: null, status: null })}>Ses cartes</a>
                  </div>
                </li>
              {/each}
            </ul>
          {/if}
        </section>

        <section class="a-section" id="journal">
          <div class="a-section-head">
            <h2>Derniers gains</h2>
            <span class="a-muted count">{data.grants.length >= 100 ? '100 derniers' : plural(data.grants.length, 'gain')}</span>
          </div>

          <form class="a-toolbar" onsubmit={(e) => { e.preventDefault(); go({ who: who.trim(), user: null }); }}>
            <label class="a-search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <span class="a-sr">Pseudo du joueur</span>
              <input type="search" placeholder="Pseudo exact du joueur" bind:value={who} />
            </label>
            <button class="a-btn">Filtrer</button>
          </form>
          <div class="a-chips">
            <button class="a-chip" type="button" aria-pressed={!data.filters.status} onclick={() => go({ status: null })}>Tous</button>
            {#each Object.entries(GRANT_STATUSES) as [key, label] (key)}
              <button class="a-chip" type="button" aria-pressed={data.filters.status === key} onclick={() => go({ status: key })}>{label}s</button>
            {/each}
          </div>

          {#if data.filters.whoMissing}
            <p class="a-err">Aucun joueur avec le pseudo « {data.filters.who} ».</p>
          {/if}
          {#if data.filters.user}
            <div class="a-card who-bar">
              <span>Cartes de <b>{data.filters.username || 'ce joueur'}</b></span>
              <div class="a-btns">
                <a class="a-btn small" href="/admin/users/{data.filters.user}">Profil</a>
                <button class="a-btn small danger" type="button" onclick={() => ask('revokeUser', { user_id: data.filters.user }, 'Retirer toutes ses cartes ?', `Toutes les cartes gagnées par ${data.filters.username || 'ce joueur'} (données ou en attente) sont retirées, et ses signaux sont classés.`)}>Tout retirer</button>
                <button class="a-btn small" type="button" onclick={() => { who = ''; go({ user: null, who: null }); }}>Tous les joueurs</button>
              </div>
            </div>
          {/if}

          <ul class="a-list">
            {#each data.grants as g (g.id)}
              <li class="grant" class:off={g.status === 'revoked' || g.status === 'lost'}>
                <i class="bar" data-r={g.cards?.rarity}></i>
                <div class="item-main">
                  <a class="card-name" href={href({ card: g.cards?.number })}><b>{g.cards?.title ?? 'Carte supprimée'}</b> <span class="a-muted">· {g.cards?.artist ?? ''}</span></a>
                  <span class="a-row-sub">
                    <a class="who" href="/admin/users/{g.user_id}">{g.username ?? 'Joueur inconnu'}</a>
                    · {seconds(g.answer_ms)}{g.mode === 'qcm' ? ' en QCM' : ''} · {g.active_accounts} joueurs · room {g.room_id}, manche {g.round} · {ago(g.created_at)}
                  </span>
                </div>
                <div class="grant-side">
                  <em class="a-tag {STATUS_TONE[g.status]}">{GRANT_STATUSES[g.status]}</em>
                  {#if g.delayed}<em class="a-tag">compte neuf</em>{/if}
                  {#if !data.filters.user}
                    <a class="a-btn small" href={href({ user: g.user_id, who: null })} title="Voir seulement ce joueur">Filtrer</a>
                  {/if}
                  {#if g.status === 'granted' || g.status === 'pending'}
                    <button class="a-btn small danger" type="button" onclick={() => ask('revokeGrant', { id: g.id }, 'Retirer cette carte ?', `« ${g.cards?.title} » quitte la collection de ${g.username ?? 'ce joueur'}.`)}>Retirer</button>
                  {/if}
                </div>
              </li>
            {:else}
              <li class="a-empty">Aucun gain pour ce filtre.</li>
            {/each}
          </ul>
        </section>
      </div>

      <div>
        <section class="a-section">
          <div class="a-section-head">
            <h2>Raretés</h2>
            <span class="a-muted count">{nf(catalog)} cartes</span>
          </div>
          <div class="stack" role="img" aria-label="Répartition du catalogue par rareté">
            {#each data.stats.rarity as r (r.key)}
              {#if r.catalog}<i data-r={r.key} style:flex-grow={r.catalog} title="{RARITIES[r.key].label} : {pct(r.catalog, catalog)} %"></i>{/if}
            {/each}
          </div>
          <table class="rar">
            <thead><tr><th>Rareté</th><th class="num">Catalogue</th><th class="num">Chez les joueurs</th></tr></thead>
            <tbody>
              {#each data.stats.rarity as r (r.key)}
                <tr>
                  <td><button class="rar-name" type="button" onclick={() => go({ rarity: r.key, q: search.trim() })}><i class="dot" data-r={r.key}></i>{RARITIES[r.key].label}</button></td>
                  <td class="num">{nf(r.catalog)} <span class="a-muted">{pct(r.catalog, catalog)} %</span></td>
                  <td class="num">{nf(r.owned)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          <p class="a-muted note">
            {plural(data.stats.provisional, 'carte')} en ascension : sorties récentes ou ajoutées pendant les fêtes, leur rareté est revue chaque mois. Les autres sont figées.
          </p>
        </section>

        <section class="a-section" id="chercher">
          <div class="a-section-head"><h2>Chercher une carte</h2></div>
          <form class="a-toolbar" onsubmit={(e) => { e.preventDefault(); go({ q: search.trim(), card: null }); }}>
            <label class="a-search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <span class="a-sr">Numéro, titre ou artiste</span>
              <input type="search" placeholder="Numéro, titre ou artiste" bind:value={search} />
            </label>
            <button class="a-btn">Chercher</button>
          </form>
          <div class="a-chips">
            <button class="a-chip" type="button" aria-pressed={!data.search.rarity} onclick={() => go({ rarity: null })}>Toutes</button>
            {#each RARITY_ORDER as r (r)}
              <button class="a-chip" type="button" aria-pressed={data.search.rarity === r} onclick={() => go({ rarity: r })}><i class="dot" data-r={r}></i>{RARITIES[r].label}</button>
            {/each}
          </div>
          {#if data.cardNumber && !data.card}
            <p class="a-err">Carte n° {data.cardNumber} introuvable.</p>
          {/if}
          {#if data.search.results}
            <ul class="a-list">
              {#each data.search.results as c (c.id)}
                <li>
                  <a class="a-row" href={href({ card: c.number })}>
                    <i class="bar" data-r={c.rarity}></i>
                    <span class="a-row-main">
                      <span class="a-row-title">{c.title}</span>
                      <span class="a-row-sub">n° {c.number} · {c.artist}{c.year ? ` · ${c.year}` : ''}</span>
                    </span>
                    {#if !c.rarity_locked_at}<em class="a-tag accent">en ascension</em>{/if}
                  </a>
                </li>
              {:else}
                <li class="a-empty">Aucune carte trouvée.</li>
              {/each}
            </ul>
          {:else}
            <p class="a-muted note">Tape un numéro, un titre ou un artiste, ou choisis une rareté pour voir les dernières cartes créées.</p>
          {/if}
        </section>

        <section class="a-section">
          <div class="a-section-head">
            <h2>Duos à surveiller</h2>
            <span class="a-muted count">30 jours</span>
          </div>
          <p class="a-muted note">Joueurs qui gagnent presque toutes leurs cartes avec le même partenaire. C'est un indice, pas une preuve.</p>
          <ul class="a-list">
            {#each data.pairs as p (p.userId + p.partnerId)}
              <li class="item">
                <div class="item-main">
                  <span><a class="who" href={href({ user: p.userId, who: null })}>{p.username ?? '?'}</a> <span class="a-muted">avec</span> <a class="who" href={href({ user: p.partnerId, who: null })}>{p.partner ?? '?'}</a></span>
                  <div class="a-meter"><i class="warn" style:width="{pct(p.together, p.games)}%"></i></div>
                  <span class="a-row-sub">Ensemble dans {pct(p.together, p.games)} % de ses {p.games} parties avec carte · {plural(p.cards, 'carte')}</span>
                </div>
              </li>
            {:else}
              <li class="a-empty">Aucun duo suspect.</li>
            {/each}
          </ul>
        </section>

        <section class="a-section">
          <div class="a-section-head">
            <h2>Contrôle du catalogue</h2>
            <form method="POST" action="?/audit" use:enhance={submitting}>
              <button class="a-btn small primary" disabled={busy}>{busy ? 'Contrôle…' : 'Lancer'}</button>
            </form>
          </div>
          {#if form?.audit}
            {@const a = form.audit}
            <div class="a-grid2">
              <div class="a-card mini"><span class="a-big">{nf(a.cards)}</span><span class="a-muted">cartes pour {nf(a.tracks)} titres</span></div>
              <div class="a-card mini"><span class="a-big">{nf(a.unchecked)}</span><span class="a-muted">titres pas encore vérifiés</span></div>
              <div class="a-card mini" class:warn={a.withoutCardCount}><span class="a-big">{nf(a.withoutCardCount)}</span><span class="a-muted">titres vérifiés sans carte</span></div>
              <div class="a-card mini" class:warn={a.removableCards}><span class="a-big">{nf(a.orphanCards)}</span><span class="a-muted">cartes sans titre, dont {nf(a.removableCards)} jamais gagnées</span></div>
            </div>
            {#if a.removableCards}
              <button class="a-btn danger" type="button" onclick={() => ask('cleanOrphans', {}, 'Supprimer les cartes inutiles ?', `${plural(a.removableCards, 'carte')} sans titre et jamais gagnée${a.removableCards > 1 ? 's' : ''} vont être supprimée${a.removableCards > 1 ? 's' : ''}.`)}>Supprimer {plural(a.removableCards, 'carte')} inutile{a.removableCards > 1 ? 's' : ''}</button>
            {/if}
            {#if a.withoutCard.length}
              <details>
                <summary>Voir les titres sans carte</summary>
                <ul class="plain">
                  {#each a.withoutCard as t (t.id)}<li>{t.artist} · {t.title}</li>{/each}
                </ul>
              </details>
            {/if}
          {:else}
            <p class="a-muted note">Compte les titres sans carte et les cartes que plus aucun titre n'utilise.</p>
          {/if}
        </section>
      </div>
    </div>
  </div>
</div>

<Sheet bind:open={confirmOpen} title={confirm?.title ?? ''}>
  {#if confirm}
    <p class="sheet-text">{confirm.text}</p>
    <p class="a-muted sheet-text">L'action est enregistrée dans le journal.</p>
    <form method="POST" action="?/{confirm.action}" use:enhance={submitting} class="a-btns">
      {#each Object.entries(confirm.fields) as [name, value] (name)}<input type="hidden" {name} {value} />{/each}
      <button type="button" class="a-btn" onclick={() => (confirmOpen = false)}>Annuler</button>
      <button class="a-btn danger" disabled={busy}>Confirmer</button>
    </form>
  {/if}
</Sheet>

<Sheet bind:open={fixOpen} title="Corriger la carte">
  {#if fixing}
    {@render correctForm(fixing.card, fixing.reportId)}
  {/if}
</Sheet>

<Sheet bind:open={() => !!data.card, (v) => !v && go({ card: null })} title={data.card ? `Carte n° ${data.card.number}` : ''} wide>
  {#if data.card}
    {@const c = data.card}
    {@const album = c.card_albums}
    <div class="detail">
      <div class="detail-head" data-r={c.rarity}>
        {#if album?.cover_md_url || album?.cover_url}
          <img class="cover" src={album.cover_md_url || album.cover_url} alt="" />
        {/if}
        <div>
          <p class="d-title">{c.title}</p>
          <p>{c.artist}</p>
          <p class="a-muted">{album?.title ?? 'Album inconnu'}{c.year ? ` · ${c.year}` : ''}</p>
          <p class="d-tags">
            <em class="rtag" data-r={c.rarity}>{RARITIES[c.rarity]?.label}</em>
            {#if c.rarity_locked_at}
              <em class="a-tag">figée {ago(c.rarity_locked_at)}</em>
            {:else}
              <em class="a-tag accent">en ascension</em>
            {/if}
          </p>
        </div>
      </div>

      <div class="a-grid2 d-stats">
        <div class="a-card mini"><span class="a-big">{popularity(c.deezer_rank)}</span><span class="a-muted">popularité Deezer sur 100</span></div>
        <div class="a-card mini"><span class="a-big">{nf(c.ownersCount)}</span><span class="a-muted">joueurs la possèdent</span></div>
        <div class="a-card mini"><span class="a-big">{nf(c.tracks)}</span><span class="a-muted">titres du catalogue liés</span></div>
        <div class="a-card mini"><span class="a-big">{nf(c.grants.granted)}</span><span class="a-muted">gains · {c.grants.pending} en attente · {c.grants.revoked} retirés</span></div>
      </div>

      <p class="a-muted note">
        La rareté vient de la popularité Deezer au moment de la création ({nf(c.deezer_rank)}).
        {c.rarity_locked_at ? 'Elle est figée et ne bouge plus.' : 'Titre récent : elle est revue chaque mois, seulement à la hausse.'}
        Pour la changer, corrige la carte avec la bonne version Deezer.
      </p>

      <div class="a-btns">
        <a class="a-btn small" href="/carte/{c.number}" target="_blank" rel="noopener">Page publique</a>
        <a class="a-btn small" href="https://www.deezer.com/track/{c.deezer_track_id}" target="_blank" rel="noopener">Écouter sur Deezer</a>
      </div>

      {#if c.sets.length}
        <h3 class="sub">Sets</h3>
        <ul class="tags">
          {#each c.sets as s (s.id)}<li class="a-tag">{SET_KINDS[s.kind] ?? s.kind} · {s.name} · {s.card_count} cartes</li>{/each}
        </ul>
      {/if}

      <h3 class="sub">Possesseurs {c.ownersCount > c.owners.length ? `(les ${c.owners.length} premiers)` : ''}</h3>
      {#if c.owners.length}
        <ul class="a-list">
          {#each c.owners as o (o.user_id)}
            <li>
              <a class="a-row" href="/admin/users/{o.user_id}">
                <span class="a-row-main">
                  <span class="a-row-title">{o.username ?? 'Joueur inconnu'}</span>
                  <span class="a-row-sub">obtenue {ago(o.first_obtained_at)}{o.copies > 1 ? ` · ${o.copies} exemplaires` : ''}{c.firstOwner?.id === o.user_id ? ' · premier possesseur' : ''}</span>
                </span>
              </a>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="a-muted note">Personne ne la possède encore.</p>
      {/if}

      <h3 class="sub">Mauvais titre ?</h3>
      {@render correctForm(c, null)}
    </div>
  {/if}
</Sheet>

{#snippet correctForm(card, reportId)}
  <form method="POST" action="?/correctCard" use:enhance={submitting} class="a-form">
    <p class="sheet-text"><b>{card.title}</b> · {card.artist}</p>
    <p class="a-muted note">Colle le lien Deezer du bon titre. La bonne carte remplace celle-ci pour tous les joueurs qui l'ont, et sa rareté peut changer.</p>
    <input type="hidden" name="card_id" value={card.id} />
    {#if reportId}<input type="hidden" name="report_id" value={reportId} />{/if}
    <label class="a-label">
      Lien ou numéro Deezer
      <input class="a-input" name="deezer" placeholder="https://www.deezer.com/track/…" required />
    </label>
    {#if form?.error}<p class="a-err">{form.error}</p>{/if}
    <button class="a-btn primary" disabled={busy}>{busy ? 'Correction…' : 'Corriger la carte'}</button>
  </form>
{/snippet}

<style>
  [data-r] { --rc: #8b9099; }
  [data-r='uncommon'] { --rc: #2fbf71; }
  [data-r='rare'] { --rc: #3b82f6; }
  [data-r='epic'] { --rc: #9b5cf6; }
  [data-r='legendary'] { --rc: #e8b84a; }
  [data-r='mythic'] { --rc: #ff4fc8; }

  .dot { display: inline-block; flex: 0 0 auto; width: 9px; height: 9px; margin-right: 6px; border-radius: 50%; background: var(--rc); vertical-align: 1px; }
  .bar { flex: 0 0 4px; align-self: stretch; border-radius: 4px; background: var(--rc); }

  .flash { font-size: 0.9rem; font-weight: 600; }
  a.a-kpi { color: inherit; text-decoration: none; }
  .a-kpi.hot { border-color: rgba(251, 191, 36, 0.45); background: var(--a-warn-soft); }
  .count { font-size: 0.82rem; }
  .note { font-size: 0.82rem; line-height: 1.45; }
  .sub { margin-top: 4px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--a-dim); }

  .item, .grant { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding: 12px 14px; border: 1px solid var(--a-line); border-radius: 14px; background: var(--a-bg); }
  .item-main { flex: 1 1 240px; min-width: 0; display: grid; gap: 4px; font-size: 0.9rem; }
  .item .a-btns { flex: 0 1 auto; }
  .item .a-btns form { display: contents; }
  .card-name { overflow: hidden; color: var(--a-fg); text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
  a.card-name:hover b { color: var(--a-accent); }
  q { font-size: 0.86rem; font-style: italic; color: var(--a-muted); overflow-wrap: anywhere; }
  .who { color: var(--a-cyan); font-weight: 700; text-decoration: none; }
  .who:hover { text-decoration: underline; }

  .grant { flex-wrap: nowrap; }
  .grant .item-main { flex: 1 1 auto; }
  .grant .a-row-sub { white-space: normal; }
  .grant.off { opacity: 0.55; }
  .grant-side { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 6px; }
  @media (max-width: 599px) {
    .grant { flex-wrap: wrap; }
    .grant .item-main { flex-basis: calc(100% - 20px); }
    .grant-side { width: 100%; justify-content: flex-start; padding-left: 16px; }
  }

  .who-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }

  .stack { display: flex; height: 14px; overflow: hidden; border-radius: 99px; background: var(--a-surface2); }
  .stack i { flex-basis: 0; min-width: 3px; background: var(--rc); }
  .rar { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  .rar th { padding: 4px 0 8px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-align: left; text-transform: uppercase; color: var(--a-dim); }
  .rar td { padding: 7px 0; border-top: 1px solid var(--a-line); }
  .rar .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .rar .num span { display: inline-block; min-width: 46px; font-size: 0.78rem; }
  .rar-name { padding: 0; border: 0; background: none; color: var(--a-fg); font: inherit; font-weight: 600; cursor: pointer; }
  .rar-name:hover { color: var(--a-accent); }

  .mini { display: grid; gap: 6px; padding: 12px; }
  .mini .a-big { font-size: 1.6rem; }
  .mini .a-muted { font-size: 0.78rem; }
  details summary { cursor: pointer; font-size: 0.85rem; color: var(--a-muted); }
  .plain { max-height: 260px; overflow: auto; margin-top: 8px; padding-left: 18px; font-size: 0.8rem; color: var(--a-muted); line-height: 1.6; }

  .sheet-text { margin-bottom: 10px; }
  .detail { display: grid; gap: 14px; }
  .detail-head { display: flex; gap: 14px; align-items: center; padding: 12px; border: 1px solid color-mix(in srgb, var(--rc) 45%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--rc) 12%, transparent); }
  .cover { flex: 0 0 auto; width: 88px; height: 88px; border-radius: 10px; object-fit: cover; }
  .d-title { font-family: var(--a-display); font-size: 1.4rem; font-weight: 800; line-height: 1.1; }
  .d-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .rtag { padding: 2px 9px; border-radius: 99px; background: var(--rc); color: #111; font-size: 0.74rem; font-style: normal; font-weight: 800; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; }
  @media (min-width: 900px) { .d-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
</style>
