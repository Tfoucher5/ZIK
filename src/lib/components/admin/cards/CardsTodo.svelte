<script>
  import { enhance } from '$app/forms';
  import { ago } from '$lib/shared/admin/stats-utils.js';
  import { SIGNAL_REASONS, signalDetail } from '$lib/shared/admin/cartes.js';

  /** Cartes signalées par les joueurs et gains suspects, à traiter. */
  let { c, reports, signals, todo } = $props();
</script>

<section class="a-section" id="a-traiter">
  <div class="a-section-head">
    <h2>À traiter</h2>
    {#if todo}<em class="a-tag warn">{todo}</em>{/if}
  </div>

  {#if !todo}
    <p class="a-ok">Rien à traiter : aucune carte signalée, aucun signal de triche.</p>
  {/if}

  {#if reports.length}
    <h3 class="sub">Cartes signalées par les joueurs</h3>
    <ul class="a-list">
      {#each reports as r (r.id)}
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
              <button class="a-btn small primary" type="button" onclick={() => c.fix(r.card, r.id)}>Corriger</button>
              <a class="a-btn small" href={c.href({ card: r.card.number })}>Voir la carte</a>
            {/if}
            <form method="POST" action="?/dismissReport" use:enhance={c.submitting}>
              <input type="hidden" name="id" value={r.id} />
              <button class="a-btn small" disabled={c.busy}>Classer</button>
            </form>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if signals.length}
    <h3 class="sub">Gains suspects</h3>
    <ul class="a-list">
      {#each signals as s (s.id)}
        {@const card = s.card_grants?.cards}
        <li class="item">
          <div class="item-main">
            <span><a class="who" href="/admin/users/{s.user_id}">{s.username ?? 'Joueur inconnu'}</a> · {SIGNAL_REASONS[s.reason] ?? s.reason} <span class="a-muted">{signalDetail(s)}</span></span>
            {#if card}<span class="card-name"><i class="dot" data-r={card.rarity}></i>{card.title} <span class="a-muted">· {card.artist}</span></span>{/if}
            <span class="a-row-sub">{ago(s.created_at)}{s.card_grants?.status === 'revoked' ? ' · carte déjà retirée' : ''}</span>
          </div>
          <div class="a-btns">
            <form method="POST" action="?/reviewSignal" use:enhance={c.submitting}>
              <input type="hidden" name="id" value={s.id} />
              <button class="a-btn small good" disabled={c.busy}>Vu, rien à signaler</button>
            </form>
            {#if s.grant_id && s.card_grants?.status !== 'revoked'}
              <button class="a-btn small danger" type="button" onclick={() => c.ask('revokeGrant', { id: s.grant_id }, 'Retirer cette carte ?', `« ${card?.title} » quitte la collection de ${s.username ?? 'ce joueur'}.`)}>Retirer la carte</button>
            {/if}
            <a class="a-btn small" href={c.href({ user: s.user_id, who: null, status: null })}>Ses cartes</a>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  q { font-size: 0.86rem; font-style: italic; color: var(--a-muted); overflow-wrap: anywhere; }
</style>
