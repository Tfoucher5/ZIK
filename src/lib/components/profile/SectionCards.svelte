<script>
  import Card from '$lib/components/card/Card.svelte';
  import { RARITIES, RARITY_ORDER } from '$lib/components/card/rarity.js';

  /** Aperçu de la collection sur le profil : raretés et cartes les plus rares. */
  let { username, sb } = $props();

  let cards = $state(null);

  $effect(() => {
    const name = username;
    if (!name || !sb) return;
    (async () => {
      const token = (await sb.auth.getSession())?.data?.session?.access_token;
      const r = await fetch(`/api/cards/collection/${encodeURIComponent(name)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => null);
      cards = r?.ok ? (await r.json()).cards : [];
    })();
  });

  const best = $derived(
    [...(cards ?? [])]
      .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.rank - a.rank)
      .slice(0, 5),
  );
  const counts = $derived(RARITY_ORDER.map((r) => [r, (cards ?? []).filter((c) => c.rarity === r).length]));
</script>

{#if cards === null}
  <p class="sc-msg">Chargement…</p>
{:else if !cards.length}
  <p class="sc-msg">Pas encore de carte. Elles se gagnent en trouvant un titre en premier dans une partie à plusieurs.</p>
{:else}
  <div class="sc">
    <ul class="sc-counts" aria-label="Cartes par rareté">
      {#each counts as [r, n] (r)}
        <li data-rarity={r} class:empty={!n}>
          <strong>{n}</strong>
          <span>{RARITIES[r].label}</span>
        </li>
      {/each}
    </ul>
    <ul class="sc-best">
      {#each best as c (c.id)}
        <li><Card card={c} size="sm" inspectable list={best} /></li>
      {/each}
    </ul>
    <a class="sc-link" href={`/collection/${encodeURIComponent(username)}`}>
      Voir les {cards.length} carte{cards.length > 1 ? 's' : ''}
    </a>
  </div>
{/if}

<style>
  .sc {
    display: grid;
    gap: 18px;
  }

  .sc-msg {
    margin: 0;
    color: var(--mid);
  }

  .sc-counts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .sc-counts li {
    display: grid;
    gap: 2px;
    padding: 10px 12px;
    border-left: 3px solid var(--rc);
    border-radius: 6px;
    background: var(--surface);
  }

  .sc-counts li.empty {
    opacity: 0.45;
  }

  .sc-counts strong {
    font: 700 1.4rem/1 'Barlow Condensed', sans-serif;
    font-variant-numeric: tabular-nums;
  }

  .sc-counts span {
    font-size: 0.8rem;
    color: var(--mid);
  }

  .sc-best {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .sc-link {
    justify-self: start;
    color: var(--accent);
    font-weight: 600;
  }
</style>
