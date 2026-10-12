<script>
  let { playing, unlocked, onclick } = $props();
</script>

<!-- Lecture -->
<button class="zk-play" {onclick} disabled={playing}>
  <span class="zk-play-ico" aria-hidden="true">
    {#if playing}
      <span class="zk-eq"><i></i><i></i><i></i><i></i></span>
    {:else}
      <span class="zk-tri"></span>
    {/if}
  </span>
  <span class="zk-play-txt">{playing ? "Lecture" : "Écouter"}</span>
  <span class="zk-play-dur">{unlocked}s</span>
</button>

<style>
  .zk-play {
    -webkit-appearance: none;
    appearance: none;
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 0;
    height: clamp(54px, 8.4vh, 74px);
    background: var(--accent);
    border: none;
    color: var(--on-accent);
    cursor: pointer;
    font-family: var(--zk-cond);
    text-align: left;
    animation: zk-in 0.5s 0.45s ease both;
    transition:
      filter 0.15s,
      transform 0.1s,
      box-shadow 0.2s;
    box-shadow: 0 6px 30px rgb(var(--accent-rgb) / 0.32);
  }
  .zk-play:hover:not(:disabled) {
    filter: brightness(1.08);
    box-shadow: 0 8px 38px rgb(var(--accent-rgb) / 0.5);
  }
  .zk-play:active:not(:disabled) {
    transform: translateY(1px);
  }
  .zk-play:disabled {
    cursor: default;
  }
  .zk-play-ico {
    display: flex;
    align-items: center;
    justify-content: center;
    width: clamp(54px, 8.4vh, 74px);
    align-self: stretch;
    background: rgb(0 0 0 / 0.16);
    flex-shrink: 0;
  }
  .zk-tri {
    width: 0;
    height: 0;
    margin-left: 3px;
    border-style: solid;
    border-width: 8px 0 8px 13px;
    border-color: transparent transparent transparent var(--on-accent);
  }
  .zk-eq {
    display: flex;
    align-items: flex-end;
    gap: 2.5px;
    height: 17px;
  }
  .zk-eq i {
    display: block;
    width: 3px;
    height: 100%;
    background: var(--on-accent);
    transform-origin: bottom;
    animation: zk-eq 0.62s ease-in-out infinite;
  }
  .zk-eq i:nth-child(1) {
    animation-delay: -0.5s;
  }
  .zk-eq i:nth-child(2) {
    animation-delay: -0.22s;
  }
  .zk-eq i:nth-child(3) {
    animation-delay: -0.37s;
  }
  .zk-eq i:nth-child(4) {
    animation-delay: -0.06s;
  }
  .zk-play-txt {
    flex: 1;
    font-weight: 900;
    font-size: 1.02rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }
  .zk-play-dur {
    font-family: var(--zk-mono);
    font-weight: 700;
    font-size: 0.86rem;
    padding-right: 18px;
    opacity: 0.72;
  }

  @keyframes zk-eq {
    0%,
    100% {
      transform: scaleY(0.35);
    }
    50% {
      transform: scaleY(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .zk-play,
    .zk-eq i {
      animation: none !important;
    }
  }
</style>
