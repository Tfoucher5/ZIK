<script>
  import CardFan from './CardFan.svelte';
  import DiamondDisc from './DiamondDisc.svelte';
  import RarityBar from './RarityBar.svelte';
  import PlayerActions from '$lib/components/player/PlayerActions.svelte';

  /** N°1 du classement : disque de diamant, ou ses plus belles cartes sur l'onglet Cartes. */
  let { lb, p } = $props();

  const showcase = $derived(lb.tab === 'cartes' && p.best?.length > 0);
</script>

<section class="champ" class:has-cards={showcase}>
  {#if showcase}
    <CardFan cards={p.best} />
  {:else}
    <DiamondDisc avatarUrl={p.avatar_url} username={p.username} />
  {/if}

  <div class="info">
    <span class="tag">★ N°1 du classement</span>
    <a href="/user/{p.username}" class="name" class:is-me={lb.isMe(p.username)}>{p.username}</a>
    <p class="meta">
      {#if lb.tab === 'elo'}<b>Nv.&nbsp;{p.level}</b>&nbsp;·&nbsp;{/if}{lb.metaOf(p)}
      {#if lb.isMe(p.username)}· <b class="me-flag">C'est toi</b>{/if}
    </p>
    {#if lb.tab === 'cartes'}
      <div class="rarities"><RarityBar byRarity={p.byRarity} legend /></div>
    {/if}
  </div>

  <div class="val">
    <div class="num">{lb.valueLabel(p)}</div>
    <div class="unit">{lb.unit}</div>
    <div class="cert">💎 Disque de diamant</div>
  </div>
  {#if !lb.isMe(p.username)}<div class="acts"><PlayerActions username={p.username} userId={p.id} /></div>{/if}
</section>

<style>
  .champ {
    margin-top: 34px;
    border: 1px solid var(--border2);
    border-radius: var(--r);
    position: relative;
    overflow: hidden;
    background: linear-gradient(100deg, rgb(var(--accent-rgb) / 0.1), transparent 45%), var(--bg2);
    display: grid;
    grid-template-columns: 280px 1fr auto;
    align-items: center;
    gap: 20px;
    min-height: 240px;
  }
  .champ.has-cards {
    grid-template-columns: 340px 1fr auto;
    min-height: 280px;
  }
  .acts {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 2;
  }


  .info {
    padding: 34px 0;
    min-width: 0;
  }
  .tag {
    display: inline-block;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 0.7rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--on-accent);
    background: var(--accent);
    border-radius: var(--radius-sm);
    padding: 5px 10px;
  }
  .name {
    display: block;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    text-transform: uppercase;
    line-height: 0.9;
    color: var(--text);
    font-size: clamp(44px, 6vw, 84px);
    margin-top: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.15s;
  }
  .name:hover,
  .name.is-me {
    color: var(--accent);
  }
  .meta {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.85rem;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--mid);
    margin-top: 12px;
  }
  .meta b {
    color: var(--text);
  }
  .meta .me-flag {
    color: var(--accent);
  }
  .rarities {
    margin-top: 16px;
    max-width: 420px;
  }
  .val {
    padding-right: 44px;
    text-align: right;
  }
  .num {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    line-height: 1;
    font-size: clamp(56px, 6.5vw, 100px);
    color: transparent;
    -webkit-text-stroke: 2.5px var(--accent);
  }
  .unit {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 0.75rem;
    letter-spacing: 0.34em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .cert {
    margin-top: 12px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.66rem;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--dim);
  }

  @media (max-width: 960px) {
    .info {
      padding-right: 44px;
    }
    .champ,
    .champ.has-cards {
      grid-template-columns: 150px 1fr;
      min-height: 190px;
    }
    .champ.has-cards {
      grid-template-columns: 1fr;
    }
    .champ.has-cards .info {
      padding: 0 24px;
    }
    .val {
      grid-column: 2;
      padding: 0 24px 22px;
      text-align: left;
      display: flex;
      align-items: baseline;
      gap: 12px;
      flex-wrap: wrap;
    }
    .champ.has-cards .val {
      grid-column: 1;
    }
    .num {
      font-size: 52px;
    }
    .cert {
      margin-top: 0;
    }
  }
  @media (max-width: 640px) {
    .champ {
      grid-template-columns: 92px 1fr;
      gap: 12px;
      min-height: 150px;
    }
    .info {
      padding: 20px 0;
    }
    .name {
      font-size: 11vw;
    }
    .meta {
      font-size: 0.7rem;
      letter-spacing: 0.16em;
    }
    .val {
      padding: 0 16px 18px;
    }
    .num {
      font-size: 42px;
      -webkit-text-stroke-width: 2px;
    }
  }
</style>
