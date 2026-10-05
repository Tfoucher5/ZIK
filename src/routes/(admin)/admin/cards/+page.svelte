<script>
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { getContext } from 'svelte';
  import { RARITIES, RARITY_ORDER } from '$lib/components/card/rarity.js';

  let { data, form } = $props();
  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let confirm = $state(null);
  let busy = $state(false);

  const STATUS_LABELS = { pending: 'Provisoires', granted: 'Données', lost: 'Perdues', revoked: 'Révoquées' };
  const REASONS = { very_fast: 'Titre complété en moins de 1 s', many_guesses: 'Plus de 40 réponses dans la manche' };

  const fmt = (iso) =>
    new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const secs = (ms) => `${(ms / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} s`;

  function detail(s) {
    const d = s.details || {};
    if (s.reason === 'very_fast') return secs(d.ms ?? 0);
    if (s.reason === 'many_guesses') return `${d.guesses} réponses`;
    return '';
  }

  function submitting() {
    busy = true;
    return async ({ update }) => {
      busy = false;
      confirm = null;
      await update({ reset: false });
    };
  }
</script>

<div class="zk">
  <div class="zk-head">
    <h1>Cartes</h1>
    <span class="zk-date">{data.stats.owned} cartes dans les collections</span>
  </div>

  <div class="stats">
    {#each Object.entries(STATUS_LABELS) as [key, label] (key)}
      <div class="panel stat">
        <span class="stat-n">{data.stats.grants[key]}</span>
        <span class="stat-l">{label}</span>
      </div>
    {/each}
  </div>

  <div class="panel block">
    <h2>Catalogue par rareté</h2>
    <div class="rarities">
      {#each RARITY_ORDER as r (r)}
        <span class="tag" data-rarity={r}>{RARITIES[r].label} · {data.stats.rarity[r]}</span>
      {/each}
    </div>
  </div>

  <div class="panel block">
    <div class="block-head">
      <h2>Contrôle du catalogue</h2>
      <form method="POST" action="?/audit" use:enhance={submitting}>
        <input type="hidden" name="_token" value={token} />
        <button class="btn btn-primary" disabled={busy}>{busy ? 'Contrôle…' : 'Lancer le contrôle'}</button>
      </form>
    </div>
    {#if form?.audit}
      {@const a = form.audit}
      <ul class="audit">
        <li><strong>{a.tracks}</strong> titres, <strong>{a.cards}</strong> cartes</li>
        <li><strong>{a.unchecked}</strong> titres pas encore vérifiés</li>
        <li><strong>{a.withoutCardCount}</strong> titres vérifiés sans carte</li>
        <li>
          <strong>{a.orphanCards}</strong> cartes sans titre, dont <strong>{a.removableCards}</strong> jamais gagnées
          {#if a.removableCards}
            <button class="btn btn-danger btn-inline" onclick={() => (confirm = { action: 'cleanOrphans', text: `Supprimer ${a.removableCards} cartes sans titre, jamais gagnées ?` })}>Supprimer</button>
          {/if}
        </li>
      </ul>
      {#if a.withoutCard.length}
        <details>
          <summary class="hint">Titres sans carte</summary>
          <ul class="mono">
            {#each a.withoutCard as t (t.id)}
              <li>{t.artist} - {t.title}</li>
            {/each}
          </ul>
        </details>
      {/if}
    {:else if form?.deleted != null}
      <p class="hint">{form.deleted} cartes supprimées.</p>
    {:else}
      <p class="hint">Compte les titres sans carte et les cartes que plus aucun titre n'utilise.</p>
    {/if}
  </div>

  <div class="panel block">
    <h2>Signaux à examiner <span class="zk-date">{data.signals.length}</span></h2>
    {#if !data.signals.length}
      <p class="hint">Aucun signal ouvert.</p>
    {:else}
      <table>
        <tbody>
          {#each data.signals as s (s.id)}
            {@const card = s.card_grants?.cards}
            <tr>
              <td class="td-dim">{fmt(s.created_at)}</td>
              <td><a href="?user={s.user_id}" class="td-strong">{s.username ?? '?'}</a></td>
              <td>{REASONS[s.reason] ?? s.reason} <span class="td-dim">{detail(s)}</span></td>
              <td>{#if card}<span class="tag" data-rarity={card.rarity}>{card.title}</span>{/if}</td>
              <td class="actions">
                <form method="POST" action="?/reviewSignal" use:enhance={submitting}>
                  <input type="hidden" name="_token" value={token} />
                  <input type="hidden" name="id" value={s.id} />
                  <button class="btn btn-ok">Vu</button>
                </form>
                {#if s.grant_id && s.card_grants?.status !== 'revoked'}
                  <button class="btn btn-danger" onclick={() => (confirm = { action: 'revokeGrant', id: s.grant_id, text: `Révoquer la carte « ${card?.title} » de ${s.username} ?` })}>Révoquer</button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <div class="panel block">
    <div class="block-head">
      <h2>
        {data.filters.user ? `Cartes de ${data.filters.username || 'ce joueur'}` : 'Dernières cartes gagnées'}
      </h2>
      {#if data.filters.user}
        <button class="btn" onclick={() => goto('?')}>Tous les joueurs</button>
        <button class="btn btn-danger" onclick={() => (confirm = { action: 'revokeUser', userId: data.filters.user, text: `Révoquer toutes les cartes de ${data.filters.username} ?` })}>Tout révoquer</button>
      {/if}
    </div>
    {#if !data.grants.length}
      <p class="hint">Aucune carte gagnée.</p>
    {:else}
      <table>
        <thead>
          <tr><th>Date</th><th>Joueur</th><th>Carte</th><th>Temps</th><th>Comptes</th><th>Room</th><th>Statut</th><th></th></tr>
        </thead>
        <tbody>
          {#each data.grants as g (g.id)}
            <tr class:revoked={g.status === 'revoked'}>
              <td class="td-dim">{fmt(g.created_at)}</td>
              <td><a href="?user={g.user_id}" class="td-strong">{g.username ?? '?'}</a></td>
              <td>
                <a href="/carte/{g.cards?.number}" target="_blank" class="tag" data-rarity={g.cards?.rarity}>{g.cards?.title}</a>
                <span class="td-dim">{g.cards?.artist}</span>
              </td>
              <td>{secs(g.answer_ms)} <span class="td-dim">{g.mode === 'qcm' ? 'QCM' : ''}</span></td>
              <td>{g.active_accounts}</td>
              <td class="td-dim">#{g.room_id} · m{g.round}</td>
              <td class="td-dim">{STATUS_LABELS[g.status]}{g.delayed ? ' · compte neuf' : ''}</td>
              <td>
                {#if g.status === 'granted' || g.status === 'pending'}
                  <button class="btn btn-danger" onclick={() => (confirm = { action: 'revokeGrant', id: g.id, text: `Révoquer la carte « ${g.cards?.title} » de ${g.username} ?` })}>Révoquer</button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

{#if confirm}
  <div class="modal-overlay" role="presentation" onclick={() => (confirm = null)}>
    <div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && (confirm = null)}>
      <p class="modal-title">{confirm.text}</p>
      <p class="modal-warn">L'action est journalisée.</p>
      <form method="POST" action="?/{confirm.action}" use:enhance={submitting} class="modal-btns">
        <input type="hidden" name="_token" value={token} />
        {#if confirm.id}<input type="hidden" name="id" value={confirm.id} />{/if}
        {#if confirm.userId}<input type="hidden" name="user_id" value={confirm.userId} />{/if}
        <button type="button" class="btn" onclick={() => (confirm = null)}>Annuler</button>
        <button class="btn btn-danger" disabled={busy}>Confirmer</button>
      </form>
    </div>
  </div>
{/if}

<style>
  .zk {
    --c-panel: #13161e;
    --c-border: rgba(255, 255, 255, 0.07);
    --c-text: #e2e8f0;
    --c-muted: #6b7280;
    --c-green: #22c55e;
    --c-red: #ef4444;
    --c-indigo: #6366f1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--c-text);
  }

  .zk-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .zk-head h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; }
  .zk-date { font-size: 0.78rem; color: var(--c-muted); font-weight: 400; }
  h2 { font-size: 0.92rem; font-weight: 600; margin: 0; }

  .panel { background: var(--c-panel); border: 1px solid var(--c-border); border-radius: 10px; }
  .block { display: flex; flex-direction: column; gap: 12px; padding: 16px; overflow-x: auto; }
  .block-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .block-head h2 { margin-right: auto; }

  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
  .stat { display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; }
  .stat-n { font-size: 1.4rem; font-weight: 600; }
  .stat-l { font-size: 0.75rem; color: var(--c-muted); }

  .rarities { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { font-size: 0.72rem; font-weight: 500; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--c-border); color: var(--c-muted); white-space: nowrap; text-decoration: none; }
  .tag[data-rarity='uncommon'] { color: #4ade80; }
  .tag[data-rarity='rare'] { color: #60a5fa; }
  .tag[data-rarity='epic'] { color: #c084fc; }
  .tag[data-rarity='legendary'] { color: #fbbf24; }
  .tag[data-rarity='mythic'] { color: #f472b6; }

  .audit { margin: 0; padding-left: 18px; font-size: 0.84rem; display: flex; flex-direction: column; gap: 4px; }
  .mono { font: 0.75rem/1.6 ui-monospace, monospace; color: var(--c-muted); max-height: 260px; overflow: auto; }
  .hint { font-size: 0.82rem; color: var(--c-muted); margin: 0; }

  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  th { text-align: left; font-weight: 500; color: var(--c-muted); font-size: 0.72rem; padding: 6px 8px; }
  td { padding: 7px 8px; border-top: 1px solid var(--c-border); vertical-align: middle; }
  tr.revoked td { opacity: 0.45; }
  .td-strong { color: var(--c-text); font-weight: 500; text-decoration: none; }
  .td-dim { color: var(--c-muted); white-space: nowrap; }
  .actions { display: flex; gap: 6px; }

  .btn { font-family: inherit; font-size: 0.75rem; padding: 5px 10px; border-radius: 6px; border: 1px solid var(--c-border); background: rgba(255, 255, 255, 0.03); color: var(--c-text); cursor: pointer; }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .btn-inline { margin-left: 8px; }
  .btn-primary { border-color: rgba(99, 102, 241, 0.4); color: var(--c-indigo); }
  .btn-ok { border-color: rgba(34, 197, 94, 0.4); color: var(--c-green); }
  .btn-danger { border-color: rgba(239, 68, 68, 0.3); color: var(--c-red); }

  .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: grid; place-items: center; z-index: 50; padding: 16px; }
  .modal { background: var(--c-panel); border: 1px solid var(--c-border); border-radius: 12px; padding: 20px; max-width: 420px; width: 100%; display: flex; flex-direction: column; gap: 10px; }
  .modal-title { font-size: 0.95rem; font-weight: 600; margin: 0; }
  .modal-warn { font-size: 0.84rem; color: var(--c-muted); margin: 0; }
  .modal-btns { display: flex; justify-content: flex-end; gap: 8px; }
</style>
