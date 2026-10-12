<script>
  import { MAX_ATTEMPTS } from "$lib/zikle/shared.js";
  import { SKIP } from "./session.svelte.js";

  let { attempts, labels, finished, won, shakeRow } = $props();

  const rowIndices = Array.from({ length: MAX_ATTEMPTS }, (_, i) => i);
</script>

<!-- Grille des essais -->
<ol class="zk-rows">
  {#each rowIndices as i (i)}
    {@const filled = i < attempts.length}
    {@const isWin = finished && won && i === attempts.length - 1}
    {@const isSkip = filled && attempts[i] === SKIP}
    {@const isCurrent = i === attempts.length && !finished}
    <li
      class="zk-row"
      class:zk-row-filled={filled && !isWin && !isSkip}
      class:zk-row-skip={isSkip}
      class:zk-row-win={isWin}
      class:zk-row-current={isCurrent}
      class:zk-row-shake={shakeRow === i}
      style="--i: {i}"
    >
      <span class="zk-row-n">{i + 1}</span>
      <span class="zk-row-body">
        {#if isWin}
          <span class="zk-row-state zk-state-win">Trouvé</span>
          <span class="zk-row-label">{labels[i]}</span>
        {:else if isSkip}
          <span class="zk-row-state zk-state-skip">Passé</span>
        {:else if filled}
          <span class="zk-row-state zk-state-wrong">Raté</span>
          <span class="zk-row-label">{labels[i] || "Proposition oubliée"}</span>
        {:else if isCurrent}
          <span class="zk-row-state zk-state-now">À toi</span>
        {/if}
      </span>
      <span class="zk-row-mark" aria-hidden="true">
        {#if isWin}✓{:else if isSkip}⤼{:else if filled}✕{/if}
      </span>
    </li>
  {/each}
</ol>

<style>
  .zk-rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .zk-row {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) 26px;
    align-items: center;
    gap: 10px;
    height: clamp(38px, 6vh, 52px);
    padding: 0 16px;
    background: rgb(var(--c-glass) / 0.03);
    border: 1px solid var(--border);
    border-left: 3px solid var(--border);
    animation: zk-slide 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(0.05s + var(--i) * 0.045s);
    transition:
      background 0.25s,
      border-color 0.25s;
  }
  .zk-row-n {
    font-family: var(--zk-mono);
    font-size: 0.72rem;
    color: var(--dim);
  }
  /* Corps de ligne : une étiquette d'état + éventuellement ce qui a été proposé */
  .zk-row-body {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    text-align: left;
  }
  .zk-row-state {
    flex-shrink: 0;
    padding: 2px 7px;
    font-family: var(--zk-cond);
    font-weight: 900;
    font-size: 0.6rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .zk-state-win {
    background: rgb(var(--accent-rgb) / 0.2);
    color: var(--accent);
  }
  .zk-state-wrong {
    background: rgb(248 113 113 / 0.16);
    color: var(--danger);
  }
  .zk-state-skip {
    background: rgb(var(--c-glass) / 0.08);
    color: var(--mid);
  }
  .zk-state-now {
    background: transparent;
    color: var(--accent);
    padding-left: 0;
  }
  .zk-row-label {
    min-width: 0;
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.86rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mid);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .zk-row-mark {
    font-family: var(--zk-mono);
    font-weight: 700;
    font-size: 0.9rem;
    text-align: right;
  }

  .zk-row-current {
    border-left-color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.05);
    animation:
      zk-slide 0.45s cubic-bezier(0.22, 1, 0.36, 1) both,
      zk-breathe 2.4s ease-in-out 0.6s infinite;
  }
  .zk-row-filled {
    border-left-color: var(--danger);
    background: rgb(var(--c-glass) / 0.05);
  }
  .zk-row-filled .zk-row-label {
    color: var(--text);
  }
  .zk-row-filled .zk-row-mark {
    color: var(--danger);
  }
  .zk-row-skip {
    border-left-color: var(--dim);
    background: rgb(var(--c-glass) / 0.03);
  }
  .zk-row-skip .zk-row-mark {
    color: var(--dim);
  }
  .zk-row-win {
    border-color: var(--accent);
    border-left-color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.12);
    box-shadow: 0 0 24px rgb(var(--accent-rgb) / 0.25);
  }
  .zk-row-win .zk-row-label {
    color: var(--text);
  }
  .zk-row-win .zk-row-mark {
    color: var(--accent);
  }
  .zk-row-shake {
    animation: zk-shake 0.42s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  @keyframes zk-slide {
    from {
      opacity: 0;
      transform: translateX(-14px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  @keyframes zk-breathe {
    0%,
    100% {
      background: rgb(var(--accent-rgb) / 0.05);
    }
    50% {
      background: rgb(var(--accent-rgb) / 0.12);
    }
  }
  @keyframes zk-shake {
    10%,
    90% {
      transform: translateX(-2px);
    }
    20%,
    80% {
      transform: translateX(4px);
    }
    30%,
    50%,
    70% {
      transform: translateX(-6px);
    }
    40%,
    60% {
      transform: translateX(6px);
    }
  }

  @media (max-width: 560px) {
    .zk-row { height: 36px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .zk-row,
    .zk-row-current,
    .zk-row-shake {
      animation: none !important;
    }
  }
</style>
