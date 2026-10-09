<script>
  import Card from '$lib/components/card/Card.svelte';
  import RarityBar from './RarityBar.svelte';
  import PlayerActions from '$lib/components/player/PlayerActions.svelte';

  /** N°1 du classement : disque de diamant, ou ses plus belles cartes sur l'onglet Cartes. */
  let { lb, p } = $props();

  const showcase = $derived(lb.tab === 'cartes' && p.best?.length > 0);
  // best est trié de la plus rare à la moins rare : la plus rare va au centre
  const slotOf = (i, n) => (n === 3 ? [1, 0, 2][i] : i);
</script>

<section class="champ" class:has-cards={showcase}>
  {#if showcase}
    <div class="fan" style:--n={p.best.length}>
      {#each p.best as c, i (c.id)}
        <div class="fan-card" style:--i={slotOf(i, p.best.length)} style:z-index={10 - i}>
          <Card card={c} size="sm" inspectable list={p.best} />
        </div>
      {/each}
    </div>
  {:else}
    <div class="vinyl" aria-hidden="true">
      <div class="disc">
        <div class="disc-label">
          {#if p.avatar_url}
            <img src={p.avatar_url} alt="" loading="lazy" referrerpolicy="no-referrer" />
          {:else}
            <span>{p.username[0].toUpperCase()}</span>
          {/if}
        </div>
      </div>
    </div>
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

  /* Disque de diamant */
  .vinyl {
    position: relative;
    height: 100%;
    min-height: 240px;
  }
  .disc {
    position: absolute;
    left: -170px;
    top: 50%;
    transform: translateY(-50%);
    width: 400px;
    height: 400px;
    border-radius: 50%;
    background: repeating-radial-gradient(circle at 50% 50%, #a8d8ec 0 1.5px, #4a7b93 1.5px 3.8px);
    box-shadow:
      0 0 0 1px rgba(168, 216, 236, 0.4),
      30px 0 80px rgba(0, 0, 0, 0.7),
      0 0 60px rgba(125, 200, 235, 0.18);
    animation: disc-spin 14s linear infinite;
  }
  @keyframes disc-spin {
    to {
      transform: translateY(-50%) rotate(360deg);
    }
  }
  .disc::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      transparent 0 12%,
      rgb(var(--c-glass) / 0.09) 16%,
      transparent 21%,
      transparent 55%,
      rgb(var(--c-glass) / 0.05) 60%,
      transparent 66%
    );
  }
  .disc-label {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 34%;
    height: 34%;
    border-radius: 50%;
    z-index: 1;
    overflow: hidden;
    background: radial-gradient(circle, #fff, var(--accent) 75%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 2.2rem;
    color: var(--on-accent);
  }
  .disc-label img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Éventail de cartes : la plus rare au centre, devant */
  .fan {
    position: relative;
    height: 100%;
    min-height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .fan-card {
    --spread: calc((var(--i) - (var(--n) - 1) / 2));
    position: absolute;
    transform: translateX(calc(var(--spread) * 72px)) rotate(calc(var(--spread) * 9deg))
      translateY(calc(var(--spread) * var(--spread) * 8px));
    transition: transform 0.25s ease;
  }
  .fan:hover .fan-card {
    transform: translateX(calc(var(--spread) * 92px)) rotate(calc(var(--spread) * 12deg))
      translateY(calc(var(--spread) * var(--spread) * 10px));
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
    .vinyl {
      min-height: 190px;
      grid-row: 1 / span 2;
    }
    .disc {
      width: 280px;
      height: 280px;
      left: -150px;
    }
    .champ.has-cards {
      grid-template-columns: 1fr;
    }
    .fan {
      min-height: 250px;
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
    .vinyl {
      min-height: 150px;
    }
    .disc {
      width: 190px;
      height: 190px;
      left: -110px;
    }
    .fan-card {
      transform: translateX(calc(var(--spread) * 58px)) rotate(calc(var(--spread) * 8deg))
        translateY(calc(var(--spread) * var(--spread) * 6px)) scale(0.85);
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

  @media (prefers-reduced-motion: reduce) {
    .disc {
      animation: none;
    }
  }
  :global(.no-animations) .disc {
    animation: none;
  }
</style>
