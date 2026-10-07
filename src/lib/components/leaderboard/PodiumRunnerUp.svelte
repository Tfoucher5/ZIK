<script>
  import CardThumbs from './CardThumbs.svelte';
  import RarityBar from './RarityBar.svelte';

  /** 2e (disque de platine) ou 3e (disque d'or) du classement. */
  let { lb, p, rank } = $props();

  const cert = $derived(rank === 2 ? 'Disque de platine' : "Disque d'or");
  const cards = $derived(lb.tab === 'cartes');
</script>

<div class="cert-card" class:plat={rank === 2} class:gold={rank === 3}>
  <span class="rank">{rank}</span>
  <div class="mini">
    <i>
      {#if p.avatar_url}
        <img src={p.avatar_url} alt="" loading="lazy" referrerpolicy="no-referrer" />
      {:else}
        {p.username[0].toUpperCase()}
      {/if}
    </i>
  </div>
  <div class="id">
    <a href="/user/{p.username}" class="name" class:is-me={lb.isMe(p.username)}>{p.username}</a>
    <div class="sub">{cert} · {lb.metaOf(p)}</div>
    {#if cards}
      <div class="rarities"><RarityBar byRarity={p.byRarity} /></div>
    {/if}
  </div>
  {#if cards && p.best?.length}
    <CardThumbs cards={p.best} />
  {/if}
  <div class="val">{lb.valueLabel(p)}<small>{lb.unit}</small></div>
</div>

<style>
  .cert-card {
    border: 1px solid var(--border);
    border-radius: var(--r);
    background: var(--surface);
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 16px 22px;
  }
  .rank {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 2.8rem;
    line-height: 1;
    color: transparent;
    -webkit-text-stroke: 1.6px rgb(var(--c-glass) / 0.55);
  }
  .mini {
    width: 76px;
    height: 76px;
    border-radius: 50%;
    flex-shrink: 0;
    position: relative;
  }
  .plat .mini {
    background: repeating-radial-gradient(circle at 50% 50%, #dbe1ea 0 1.2px, #97a1b1 1.2px 3px);
    box-shadow: 0 0 0 1px rgba(219, 225, 234, 0.4);
  }
  .gold .mini {
    background: repeating-radial-gradient(circle at 50% 50%, #f0d488 0 1.2px, #a8842a 1.2px 3px);
    box-shadow: 0 0 0 1px rgba(240, 212, 136, 0.4);
  }
  .mini i {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 44%;
    height: 44%;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-style: normal;
    font-size: 0.85rem;
    color: #000;
  }
  .mini i img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .plat .mini i {
    background: radial-gradient(circle, #fff, #b9c4d4 78%);
  }
  .gold .mini i {
    background: radial-gradient(circle, #ffe8b0, #d9a520 78%);
  }
  .id {
    flex: 1;
    min-width: 0;
  }
  .name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 1.5rem;
    text-transform: uppercase;
    line-height: 1;
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
  .sub {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.64rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--dim);
    margin-top: 5px;
  }
  .rarities {
    margin-top: 8px;
  }
  .val {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.8rem;
    white-space: nowrap;
  }
  .val small {
    display: block;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.24em;
    color: var(--dim);
    text-align: right;
  }

  @media (max-width: 640px) {
    .cert-card {
      padding: 14px 16px;
      gap: 14px;
    }
    .mini {
      width: 56px;
      height: 56px;
    }
    .rank {
      font-size: 2rem;
    }
    .name {
      font-size: 1.2rem;
    }
    .val {
      font-size: 1.4rem;
    }
    .cert-card :global(.thumbs) {
      display: none;
    }
  }
</style>
