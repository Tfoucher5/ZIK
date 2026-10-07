<script>
  import { plural } from './leaderboard.svelte.js';

  /** Barre fixe en bas de page : position du joueur connecté et écart au suivant. */
  let { lb } = $props();

  const me = $derived(lb.myRank);
  const fmt = (n) => (lb.tab === 'elo' ? String(n) : Number(n).toLocaleString('fr-FR'));
</script>

<div class="playerbar">
  {#if !lb.myUserId}
    <div class="guest">
      <span class="guest-txt">🎧 Connecte-toi pour suivre ta position en temps réel.</span>
      <a href="/" class="cta">Se connecter</a>
    </div>
  {:else if !lb.myRankLoaded}
    <div class="guest"><span class="guest-txt">Ta position…</span></div>
  {:else if me}
    <div class="id">
      {#if me.avatar_url}
        <img class="av" src={me.avatar_url} alt={me.username} width="46" height="46" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
      {:else}
        <div class="av av-fb">{me.username[0].toUpperCase()}</div>
      {/if}
      <div class="t">
        <div class="n">{me.username}</div>
        <div class="s">
          {fmt(me.score)} {lb.unit}
          · {lb.tab === 'cartes' ? plural(me.cards, 'carte') : plural(me.games_count, 'partie')}
        </div>
      </div>
      <span class="rank">#{me.rank}</span>
    </div>
    <div class="track">
      <div class="lbl">
        {#if me.rank <= 1}
          <span>Au sommet du chart</span>
          <span class="nxt">Défends ta place</span>
        {:else}
          <span>En route vers <b>#{me.rank - 1}</b></span>
          {#if lb.gapToNext > 0}
            <span class="nxt">▲ {fmt(lb.gapToNext)} pts pour monter</span>
          {:else if lb.gapToTop > 0}
            <span class="nxt">▲ {fmt(lb.gapToTop)} pts du sommet</span>
          {:else}
            <span class="nxt">Continue de grimper</span>
          {/if}
        {/if}
      </div>
      <div class="line"><i style:width="{lb.progressPct}%"></i></div>
    </div>
    <a href="/rooms" class="cta">Jouer maintenant →</a>
  {:else}
    <div class="guest">
      <span class="guest-txt">
        {lb.tab === 'cartes'
          ? 'Pas encore de carte : trouve un titre en premier pour gagner la tienne.'
          : 'Pas encore classé dans cette catégorie.'}
      </span>
      <a href="/rooms" class="cta">Jouer maintenant →</a>
    </div>
  {/if}
</div>

<style>
  .playerbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 90;
    background: rgb(var(--bg-rgb) / 0.96);
    border-top: 1px solid rgb(var(--accent-rgb) / 0.4);
    box-shadow: 0 -12px 44px rgb(var(--accent-rgb) / 0.09);
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 28px;
    padding: 13px 48px;
  }
  .id {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .av {
    width: 46px;
    height: 46px;
    border-radius: var(--r);
    object-fit: cover;
  }
  .av-fb {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.15rem;
    background: var(--accent);
    color: var(--on-accent);
  }
  .t {
    line-height: 1.15;
  }
  .n {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 1.25rem;
    text-transform: uppercase;
  }
  .s {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.66rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .rank {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 2.3rem;
    color: transparent;
    -webkit-text-stroke: 1.8px var(--accent);
    margin-left: 8px;
  }
  .track {
    min-width: 0;
  }
  .lbl {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.66rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--dim);
    margin-bottom: 7px;
  }
  .lbl b {
    color: var(--text);
  }
  .nxt {
    color: var(--accent);
  }
  .line {
    position: relative;
    height: 5px;
    background: var(--surface2);
    border-radius: 3px;
  }
  .line i {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--accent);
    border-radius: 3px;
    box-shadow: 0 0 12px rgb(var(--accent-rgb) / 0.6);
  }
  .line i::after {
    content: '';
    position: absolute;
    right: -5px;
    top: 50%;
    transform: translateY(-50%);
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 10px rgb(var(--accent-rgb) / 0.8);
  }
  .cta {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--on-accent);
    background: var(--accent);
    border: none;
    border-radius: var(--r);
    padding: 13px 30px;
    cursor: pointer;
    white-space: nowrap;
    text-align: center;
    box-shadow: 0 0 26px rgb(var(--accent-rgb) / 0.35);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .cta:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 36px rgb(var(--accent-rgb) / 0.5);
  }
  .guest {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  .guest-txt {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--mid);
  }

  /* Bottom-nav mobile du site (58px) : remonter la barre */
  @media (max-width: 768px) {
    .playerbar {
      bottom: 58px;
    }
  }
  @media (max-width: 640px) {
    .playerbar {
      grid-template-columns: 1fr auto;
      gap: 12px;
      padding: 10px 14px;
    }
    .track,
    .s {
      display: none;
    }
    .id {
      gap: 10px;
      min-width: 0;
    }
    .av {
      width: 38px;
      height: 38px;
      flex-shrink: 0;
    }
    .t {
      min-width: 0;
    }
    .n {
      font-size: 1.05rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .rank {
      font-size: 1.6rem;
      margin-left: 0;
      flex-shrink: 0;
      -webkit-text-stroke-width: 1.4px;
    }
    .cta {
      padding: 11px 16px;
      font-size: 0.85rem;
    }
  }
</style>
