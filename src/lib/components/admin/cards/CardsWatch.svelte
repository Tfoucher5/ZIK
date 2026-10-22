<script>
  import { enhance } from '$app/forms';
  import { pct } from '$lib/shared/admin/stats-utils.js';
  import { nf, plural } from './cardsAdmin.svelte.js';

  /** Duos de joueurs à surveiller et contrôle du catalogue de cartes. */
  let { c, pairs, audit } = $props();
</script>

<section class="a-section">
  <div class="a-section-head">
    <h2>Duos à surveiller</h2>
    <span class="a-muted count">30 jours</span>
  </div>
  <p class="a-muted note">Joueurs qui gagnent presque toutes leurs cartes avec le même partenaire. C'est un indice, pas une preuve.</p>
  <ul class="a-list">
    {#each pairs as p (p.userId + p.partnerId)}
      <li class="item">
        <div class="item-main">
          <span><a class="who" href={c.href({ user: p.userId, who: null })}>{p.username ?? '?'}</a> <span class="a-muted">avec</span> <a class="who" href={c.href({ user: p.partnerId, who: null })}>{p.partner ?? '?'}</a></span>
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
    <form method="POST" action="?/audit" use:enhance={c.submitting}>
      <button class="a-btn small primary" disabled={c.busy}>{c.busy ? 'Contrôle…' : 'Lancer'}</button>
    </form>
  </div>
  {#if audit}
    {@const a = audit}
    <div class="a-grid2">
      <div class="a-card mini"><span class="a-big">{nf(a.cards)}</span><span class="a-muted">cartes pour {nf(a.tracks)} titres</span></div>
      <div class="a-card mini"><span class="a-big">{nf(a.unchecked)}</span><span class="a-muted">titres pas encore vérifiés</span></div>
      <div class="a-card mini" class:warn={a.withoutCardCount}><span class="a-big">{nf(a.withoutCardCount)}</span><span class="a-muted">titres vérifiés sans carte</span></div>
      <div class="a-card mini" class:warn={a.removableCards}><span class="a-big">{nf(a.orphanCards)}</span><span class="a-muted">cartes sans titre, dont {nf(a.removableCards)} jamais gagnées</span></div>
    </div>
    {#if a.removableCards}
      <button class="a-btn danger" type="button" onclick={() => c.ask('cleanOrphans', {}, 'Supprimer les cartes inutiles ?', `${plural(a.removableCards, 'carte')} sans titre et jamais gagnée${a.removableCards > 1 ? 's' : ''} vont être supprimée${a.removableCards > 1 ? 's' : ''}.`)}>Supprimer {plural(a.removableCards, 'carte')} inutile{a.removableCards > 1 ? 's' : ''}</button>
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

<style>
  details summary { cursor: pointer; font-size: 0.85rem; color: var(--a-muted); }
  .plain { max-height: 260px; overflow: auto; margin-top: 8px; padding-left: 18px; font-size: 0.8rem; color: var(--a-muted); line-height: 1.6; }
</style>
