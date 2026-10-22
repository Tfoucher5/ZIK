<script>
  import { page } from '$app/state';
  import { ago } from '$lib/shared/admin/stats-utils.js';
  import { GRANT_STATUSES, seconds } from '$lib/shared/admin/cartes.js';
  import { plural } from './cardsAdmin.svelte.js';

  /** Journal des derniers gains de cartes, filtrable par joueur et par statut. */
  let { c, grants, filters } = $props();

  let who = $state(page.url.searchParams.get('who') ?? '');

  const STATUS_TONE = { pending: 'warn', granted: 'good', lost: '', revoked: 'bad' };
</script>

<section class="a-section" id="journal">
  <div class="a-section-head">
    <h2>Derniers gains</h2>
    <span class="a-muted count">{grants.length >= 100 ? '100 derniers' : plural(grants.length, 'gain')}</span>
  </div>

  <form class="a-toolbar" onsubmit={(e) => { e.preventDefault(); c.go({ who: who.trim(), user: null }); }}>
    <label class="a-search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <span class="a-sr">Pseudo du joueur</span>
      <input type="search" placeholder="Pseudo exact du joueur" bind:value={who} />
    </label>
    <button class="a-btn">Filtrer</button>
  </form>
  <div class="a-chips">
    <button class="a-chip" type="button" aria-pressed={!filters.status} onclick={() => c.go({ status: null })}>Tous</button>
    {#each Object.entries(GRANT_STATUSES) as [key, label] (key)}
      <button class="a-chip" type="button" aria-pressed={filters.status === key} onclick={() => c.go({ status: key })}>{label}s</button>
    {/each}
  </div>

  {#if filters.whoMissing}
    <p class="a-err">Aucun joueur avec le pseudo « {filters.who} ».</p>
  {/if}
  {#if filters.user}
    <div class="a-card who-bar">
      <span>Cartes de <b>{filters.username || 'ce joueur'}</b></span>
      <div class="a-btns">
        <a class="a-btn small" href="/admin/users/{filters.user}">Profil</a>
        <button class="a-btn small danger" type="button" onclick={() => c.ask('revokeUser', { user_id: filters.user }, 'Retirer toutes ses cartes ?', `Toutes les cartes gagnées par ${filters.username || 'ce joueur'} (données ou en attente) sont retirées, et ses signaux sont classés.`)}>Tout retirer</button>
        <button class="a-btn small" type="button" onclick={() => { who = ''; c.go({ user: null, who: null }); }}>Tous les joueurs</button>
      </div>
    </div>
  {/if}

  <ul class="a-list">
    {#each grants as g (g.id)}
      <li class="grant" class:off={g.status === 'revoked' || g.status === 'lost'}>
        <i class="bar" data-r={g.cards?.rarity}></i>
        <div class="item-main">
          <a class="card-name" href={c.href({ card: g.cards?.number })}><b>{g.cards?.title ?? 'Carte supprimée'}</b> <span class="a-muted">· {g.cards?.artist ?? ''}</span></a>
          <span class="a-row-sub">
            <a class="who" href="/admin/users/{g.user_id}">{g.username ?? 'Joueur inconnu'}</a>
            · {seconds(g.answer_ms)}{g.mode === 'qcm' ? ' en QCM' : ''} · {g.active_accounts} joueurs · room {g.room_id}, manche {g.round} · {ago(g.created_at)}
          </span>
        </div>
        <div class="grant-side">
          <em class="a-tag {STATUS_TONE[g.status]}">{GRANT_STATUSES[g.status]}</em>
          {#if g.delayed}<em class="a-tag">compte neuf</em>{/if}
          {#if !filters.user}
            <a class="a-btn small" href={c.href({ user: g.user_id, who: null })} title="Voir seulement ce joueur">Filtrer</a>
          {/if}
          {#if g.status === 'granted' || g.status === 'pending'}
            <button class="a-btn small danger" type="button" onclick={() => c.ask('revokeGrant', { id: g.id }, 'Retirer cette carte ?', `« ${g.cards?.title} » quitte la collection de ${g.username ?? 'ce joueur'}.`)}>Retirer</button>
          {/if}
        </div>
      </li>
    {:else}
      <li class="a-empty">Aucun gain pour ce filtre.</li>
    {/each}
  </ul>
</section>

<style>
  .grant { display: flex; flex-wrap: nowrap; align-items: center; gap: 10px 12px; padding: 12px 14px; border: 1px solid var(--a-line); border-radius: 14px; background: var(--a-bg); }
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
</style>
