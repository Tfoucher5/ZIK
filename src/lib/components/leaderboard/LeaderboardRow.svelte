<script>
  import CardThumbs from './CardThumbs.svelte';
  import RarityBar from './RarityBar.svelte';
  import { plural } from './leaderboard.svelte.js';

  /** Une ligne du classement à partir du 4e. */
  let { lb, p, rank } = $props();

  const me = $derived(lb.isMe(p.username));
  const cards = $derived(lb.tab === 'cartes');
</script>

<div class="row" class:row-me={me} class:with-cards={cards}>
  <span class="rank">{rank}</span>
  <div class="player">
    {#if p.avatar_url}
      <img class="av" src={p.avatar_url} alt={p.username} width="38" height="38" loading="lazy" referrerpolicy="no-referrer" />
    {:else}
      <div class="av av-fb">{p.username[0].toUpperCase()}</div>
    {/if}
    <div class="name-wrap">
      <a href="/user/{p.username}" class="name" class:is-me={me}>{p.username}</a>
      {#if lb.tab === 'elo'}
        <small>Nv. {p.level}</small>
      {:else if cards}
        <small>{plural(p.sets, 'set')} terminé{p.sets > 1 ? 's' : ''}</small>
      {/if}
    </div>
    {#if me}<span class="me-badge">Toi</span>{/if}
  </div>
  {#if cards}
    <div class="thumbs"><CardThumbs cards={p.best} /></div>
  {/if}
  <div class="val">
    <div class="num">{lb.valueLabel(p)}</div>
    {#if cards}
      <div class="bar-cards"><RarityBar byRarity={p.byRarity} /></div>
    {:else}
      <div class="bar"><i style:width="{lb.pct(p)}%"></i></div>
    {/if}
  </div>
  <span class="count">{lb.countOf(p)}</span>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 80px 1fr 130px 80px;
    gap: 14px;
    align-items: center;
    padding: 12px 6px;
    border-bottom: 1px solid var(--border);
    transition: background 0.15s;
    content-visibility: auto;
    contain-intrinsic-size: auto 63px;
  }
  .row.with-cards {
    grid-template-columns: 80px 1fr auto 150px 80px;
  }
  .row:hover {
    background: var(--surface);
  }
  .rank {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 2.4rem;
    line-height: 1;
    color: transparent;
    -webkit-text-stroke: 1.4px rgb(var(--c-glass) / 0.45);
  }
  .player {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .av {
    width: 38px;
    height: 38px;
    border-radius: var(--r);
    object-fit: cover;
    flex-shrink: 0;
  }
  .av-fb {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1rem;
    background: var(--surface3);
    color: var(--text);
  }
  .name-wrap {
    min-width: 0;
  }
  .name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 1.3rem;
    text-transform: uppercase;
    color: var(--text);
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.15s;
  }
  .name:hover,
  .name.is-me {
    color: var(--accent);
  }
  .name-wrap small {
    display: block;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.62rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .me-badge {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 0.6rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    background: var(--accent);
    color: var(--on-accent);
    border-radius: var(--radius-sm);
    padding: 3px 7px;
    flex-shrink: 0;
  }
  .val {
    text-align: right;
  }
  .num {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.5rem;
  }
  .bar {
    height: 3px;
    background: var(--surface2);
    margin-top: 5px;
    border-radius: 2px;
    overflow: hidden;
  }
  .bar i {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width 0.6s ease;
  }
  .bar-cards {
    margin-top: 6px;
  }
  .count {
    text-align: right;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--mid);
  }
  .row-me {
    background: rgb(var(--accent-rgb) / 0.07);
    border-color: rgb(var(--accent-rgb) / 0.35);
  }
  .row-me .rank {
    color: var(--accent);
    -webkit-text-stroke: 0;
  }

  @media (max-width: 960px) {
    .row {
      grid-template-columns: 56px 1fr 110px 60px;
    }
    .row.with-cards {
      grid-template-columns: 56px 1fr auto 110px 60px;
    }
    .rank {
      font-size: 1.9rem;
    }
  }
  @media (max-width: 640px) {
    .row,
    .row.with-cards {
      grid-template-columns: 40px 1fr 90px;
      gap: 12px;
      padding: 13px 2px;
    }
    .count,
    .thumbs {
      display: none;
    }
    .rank {
      font-size: 1.5rem;
      -webkit-text-stroke-width: 1px;
    }
    .av {
      width: 32px;
      height: 32px;
    }
    .name {
      font-size: 1.05rem;
    }
    .num {
      font-size: 1.2rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bar i {
      transition: none;
    }
  }
  :global(.no-animations) .bar i {
    transition: none;
  }
</style>
