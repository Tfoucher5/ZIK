<script>
  import { scoreLabel } from "./history.js";

  let { reveal, won, attempts, shareCopied, onShare } = $props();
</script>

<!-- Résultat -->
<div class="zk-result">
  <div class="zk-result-art">
    {#if reveal?.cover_url}
      <img src={reveal.cover_url} alt="" />
    {/if}
    <span class="zk-result-badge" class:zk-badge-win={won}>
      {scoreLabel(won, attempts)}
    </span>
  </div>
  <div class="zk-result-txt">
    <p class="zk-result-kicker">{won ? "Trouvé" : "Raté"}</p>
    {#if reveal}
      <p class="zk-result-artist">{reveal.artist}</p>
      <h2 class="zk-result-title">{reveal.title}</h2>
    {/if}
    <div class="zk-result-actions">
      <button class="zk-share" onclick={onShare}>
        {shareCopied ? "Copié !" : "Partager"}
      </button>
      <a class="zk-archives" href="/zikle/archives">Archives</a>
    </div>
  </div>
</div>

<style>
  .zk-result {
    display: flex;
    gap: 22px;
    align-items: stretch;
    padding: 18px;
    background: var(--bg2);
    border: 1px solid var(--border2);
    animation: zk-pop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .zk-result-art {
    position: relative;
    width: clamp(100px, 24vw, 168px);
    aspect-ratio: 1;
    flex-shrink: 0;
    background: #0a0a0a;
    overflow: hidden;
  }
  .zk-result-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    animation: zk-reveal-art 0.7s 0.15s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .zk-result-badge {
    position: absolute;
    right: 0;
    bottom: 0;
    padding: 3px 8px;
    background: var(--danger);
    color: #000;
    font-family: var(--zk-mono);
    font-weight: 700;
    font-size: 0.74rem;
  }
  .zk-badge-win {
    background: var(--accent);
    color: var(--on-accent);
  }
  .zk-result-txt {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .zk-result-kicker {
    margin: 0 0 5px;
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.64rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .zk-result-artist {
    margin: 0;
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.86rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .zk-result-title {
    margin: 0 0 16px;
    font-family: var(--zk-cond);
    font-weight: 900;
    font-size: clamp(1.7rem, 6.4vw, 3.2rem);
    line-height: 0.94;
    letter-spacing: -0.015em;
    text-transform: uppercase;
    color: var(--text);
    overflow-wrap: anywhere;
  }
  .zk-result-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }
  .zk-result-actions .zk-share {
    flex: 1;
    min-width: 150px;
    padding: 12px 20px;
  }
  .zk-share {
    -webkit-appearance: none;
    appearance: none;
    padding: 9px 20px;
    background: var(--accent);
    border: none;
    border-radius: 2px;
    color: var(--on-accent);
    font-family: var(--zk-cond);
    font-weight: 900;
    font-size: 0.76rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      filter 0.15s,
      box-shadow 0.2s;
    box-shadow: 0 4px 20px rgb(var(--accent-rgb) / 0.3);
  }
  .zk-share:hover {
    filter: brightness(1.08);
    box-shadow: 0 6px 26px rgb(var(--accent-rgb) / 0.45);
  }
  .zk-archives {
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--mid);
    border-bottom: 1px solid var(--border2);
    padding-bottom: 1px;
    transition: color 0.15s;
  }
  .zk-archives:hover {
    color: var(--accent);
  }

  @keyframes zk-pop {
    from {
      opacity: 0;
      transform: scale(0.94);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @keyframes zk-reveal-art {
    from {
      opacity: 0;
      transform: scale(1.25);
      filter: blur(14px);
    }
    to {
      opacity: 1;
      transform: scale(1);
      filter: blur(0);
    }
  }

  @media (max-width: 560px) {
    .zk-result {
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
    }
    .zk-result-art {
      width: 100%;
      aspect-ratio: 16 / 9;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .zk-result,
    .zk-result-art img {
      animation: none !important;
    }
  }
</style>
