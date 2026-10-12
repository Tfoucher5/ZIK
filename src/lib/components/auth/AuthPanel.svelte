<script>
  /**
   * @type {{
   *   title: string, em: string, dot: string, sub: string,
   *   head: string, nowLabel: string, children: import('svelte').Snippet,
   *   switchText?: string, switchLabel?: string, onSwitch?: () => void
   * }}
   */
  let { title, em, dot, sub, head, nowLabel, children, switchText, switchLabel, onSwitch } = $props();
</script>

<h2 class="gl-title">{title} <em>{em}</em><span class="dot">{dot}</span></h2>
<p class="gl-sub">{sub}</p>

<div class="board">
  <div class="board-head"><b>{head}</b><span>{nowLabel}</span></div>
  {@render children()}
</div>

{#if switchLabel}
  <p class="gl-switch">{switchText} <button onclick={onSwitch} type="button">{switchLabel}</button></p>
{/if}

<style>
  .gl-title {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; text-transform: uppercase;
    font-size: clamp(34px, 3.2vw, 52px); line-height: 0.9; color: var(--text);
  }
  .gl-title em { font-style: normal; color: transparent; -webkit-text-stroke: 1.8px rgb(var(--c-glass, 255 255 255) / 0.85); }
  .gl-title .dot { color: var(--accent); }
  .gl-sub {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.66rem;
    letter-spacing: 0.26em; text-transform: uppercase; color: var(--mid); margin: 10px 0 22px;
  }

  .board {
    position: relative; background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--r, 5px);
    padding: 30px 26px 24px;
  }
  .board::before {
    content: ""; position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
    width: 90px; height: 22px; background: linear-gradient(180deg, #3a3a3a, #1c1c1c);
    border-radius: 5px; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.7);
  }
  .board-head {
    display: flex; justify-content: space-between; align-items: baseline;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.6rem;
    letter-spacing: 0.3em; text-transform: uppercase; color: var(--dim);
    border-bottom: 2px solid var(--text); padding-bottom: 8px;
  }
  .board-head b { color: var(--text); font-size: 0.85rem; letter-spacing: 0.2em; }

  .gl-switch { margin-top: 16px; text-align: center; font-size: 0.82rem; color: var(--mid); }
  .gl-switch button {
    background: none; border: none; cursor: pointer; color: var(--accent);
    font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 0.86rem;
    letter-spacing: 0.1em; text-transform: uppercase;
  }
  .gl-switch button:hover { text-decoration: underline; }

  @media (max-height: 760px) {
    .gl-title { font-size: clamp(28px, 3vw, 40px); }
    .gl-sub { margin: 8px 0 14px; }
    .board { padding: 22px 20px 18px; }
    .gl-switch { margin-top: 12px; }
  }
</style>
