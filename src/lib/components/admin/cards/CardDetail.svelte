<script>
  import { ago } from '$lib/shared/admin/stats-utils.js';
  import { RARITIES } from '$lib/components/card/rarity.js';
  import { SET_KINDS, popularity } from '$lib/shared/admin/cartes.js';
  import CorrectCardForm from './CorrectCardForm.svelte';
  import { nf } from './cardsAdmin.svelte.js';

  /** Fiche admin d'une carte : rareté, chiffres, sets, possesseurs et correction. */
  let { c, card, error } = $props();

  const album = $derived(card.card_albums);
</script>

<div class="detail">
  <div class="detail-head" data-r={card.rarity}>
    {#if album?.cover_md_url || album?.cover_url}
      <img class="cover" src={album.cover_md_url || album.cover_url} alt="" />
    {/if}
    <div>
      <p class="d-title">{card.title}</p>
      <p>{card.artist}</p>
      <p class="a-muted">{album?.title ?? 'Album inconnu'}{card.year ? ` · ${card.year}` : ''}</p>
      <p class="d-tags">
        <em class="rtag" data-r={card.rarity}>{RARITIES[card.rarity]?.label}</em>
        {#if card.rarity_locked_at}
          <em class="a-tag">figée {ago(card.rarity_locked_at)}</em>
        {:else}
          <em class="a-tag accent">en ascension</em>
        {/if}
      </p>
    </div>
  </div>

  <div class="a-grid2 d-stats">
    <div class="a-card mini"><span class="a-big">{popularity(card.deezer_rank)}</span><span class="a-muted">popularité Deezer sur 100</span></div>
    <div class="a-card mini"><span class="a-big">{nf(card.ownersCount)}</span><span class="a-muted">joueurs la possèdent</span></div>
    <div class="a-card mini"><span class="a-big">{nf(card.tracks)}</span><span class="a-muted">titres du catalogue liés</span></div>
    <div class="a-card mini"><span class="a-big">{nf(card.grants.granted)}</span><span class="a-muted">gains · {card.grants.pending} en attente · {card.grants.revoked} retirés</span></div>
  </div>

  <p class="a-muted note">
    La rareté vient de la popularité Deezer au moment de la création ({nf(card.deezer_rank)}).
    {card.rarity_locked_at ? 'Elle est figée et ne bouge plus.' : 'Titre récent : elle est revue chaque mois, seulement à la hausse.'}
    Pour la changer, corrige la carte avec la bonne version Deezer.
  </p>

  <div class="a-btns">
    <a class="a-btn small" href="/carte/{card.number}" target="_blank" rel="noopener">Page publique</a>
    <a class="a-btn small" href="https://www.deezer.com/track/{card.deezer_track_id}" target="_blank" rel="noopener">Écouter sur Deezer</a>
  </div>

  {#if card.sets.length}
    <h3 class="sub">Sets</h3>
    <ul class="tags">
      {#each card.sets as s (s.id)}<li class="a-tag">{SET_KINDS[s.kind] ?? s.kind} · {s.name} · {s.card_count} cartes</li>{/each}
    </ul>
  {/if}

  <h3 class="sub">Possesseurs {card.ownersCount > card.owners.length ? `(les ${card.owners.length} premiers)` : ''}</h3>
  {#if card.owners.length}
    <ul class="a-list">
      {#each card.owners as o (o.user_id)}
        <li>
          <a class="a-row" href="/admin/users/{o.user_id}">
            <span class="a-row-main">
              <span class="a-row-title">{o.username ?? 'Joueur inconnu'}</span>
              <span class="a-row-sub">obtenue {ago(o.first_obtained_at)}{o.copies > 1 ? ` · ${o.copies} exemplaires` : ''}{card.firstOwner?.id === o.user_id ? ' · premier possesseur' : ''}</span>
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="a-muted note">Personne ne la possède encore.</p>
  {/if}

  <h3 class="sub">Mauvais titre ?</h3>
  <CorrectCardForm {c} {card} {error} />
</div>

<style>
  .detail { display: grid; gap: 14px; }
  .detail-head { display: flex; gap: 14px; align-items: center; padding: 12px; border: 1px solid color-mix(in srgb, var(--rc) 45%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--rc) 12%, transparent); }
  .cover { flex: 0 0 auto; width: 88px; height: 88px; border-radius: 10px; object-fit: cover; }
  .d-title { font-family: var(--a-display); font-size: 1.4rem; font-weight: 800; line-height: 1.1; }
  .d-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .rtag { padding: 2px 9px; border-radius: 99px; background: var(--rc); color: #111; font-size: 0.74rem; font-style: normal; font-weight: 800; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; }
  @media (min-width: 900px) { .d-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
</style>
