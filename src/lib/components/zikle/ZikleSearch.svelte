<script>
  let { onGuess, onSkip } = $props();

  let query = $state("");
  let suggestions = $state([]);
  let highlighted = $state(-1);
  let searchTimer;

  function onQueryInput() {
    clearTimeout(searchTimer);
    highlighted = -1;
    if (query.trim().length < 2) {
      suggestions = [];
      return;
    }
    searchTimer = setTimeout(async () => {
      const res = await fetch(`/api/tracks/search?q=${encodeURIComponent(query.trim())}`);
      suggestions = res.ok ? await res.json() : [];
    }, 200);
  }

  async function pick(track) {
    if (!(await onGuess(track))) return;
    query = "";
    suggestions = [];
    highlighted = -1;
  }

  function onQueryKeydown(e) {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlighted = (highlighted + 1) % suggestions.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlighted = highlighted <= 0 ? suggestions.length - 1 : highlighted - 1;
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      pick(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      suggestions = [];
      highlighted = -1;
    }
  }
</script>

<!-- Saisie -->
<div class="zk-input-row">
  <div class="zk-search">
    <input
      class="zk-search-input"
      type="text"
      placeholder="Titre ou artiste…"
      autocomplete="off"
      bind:value={query}
      oninput={onQueryInput}
      onkeydown={onQueryKeydown}
    />
    {#if suggestions.length}
      <ul class="zk-suggestions">
        {#each suggestions as s, i (s.id)}
          <li>
            <button class:zk-sug-on={i === highlighted} onclick={() => pick(s)}>
              <span class="zk-sug-artist">{s.artist}</span>
              <span class="zk-sug-title">{s.title}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <button class="zk-skip" onclick={onSkip}>Passer</button>
</div>

<style>
  .zk-input-row {
    display: flex;
    gap: 8px;
    animation: zk-in 0.5s 0.55s ease both;
  }
  .zk-search {
    position: relative;
    flex: 1;
    min-width: 0;
  }
  .zk-search-input {
    width: 100%;
    height: clamp(46px, 6.6vh, 56px);
    background: var(--bg2);
    border: 1px solid var(--border2);
    border-radius: 2px;
    padding: 0 16px;
    color: var(--text);
    font-family: "Barlow", sans-serif;
    font-size: 0.92rem;
    outline: none;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  .zk-search-input::placeholder {
    color: var(--dim);
  }
  .zk-search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.14);
  }

  .zk-suggestions {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    right: 0;
    z-index: 30;
    list-style: none;
    margin: 0;
    padding: 4px;
    background: var(--modal-bg);
    border: 1px solid var(--border2);
    border-radius: 2px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.6);
    max-height: 250px;
    overflow-y: auto;
    animation: zk-in 0.18s ease both;
  }
  .zk-suggestions button {
    display: flex;
    flex-direction: column;
    gap: 1px;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    border-left: 2px solid transparent;
    color: var(--text);
    padding: 8px 12px;
    cursor: pointer;
    transition:
      background 0.12s,
      border-color 0.12s;
  }
  .zk-suggestions button:hover,
  .zk-suggestions button.zk-sug-on {
    background: rgb(var(--accent-rgb) / 0.09);
    border-left-color: var(--accent);
  }
  .zk-sug-artist {
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.68rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .zk-sug-title {
    font-size: 0.88rem;
    color: var(--text);
  }

  .zk-skip {
    -webkit-appearance: none;
    appearance: none;
    height: clamp(46px, 6.6vh, 56px);
    padding: 0 26px;
    background: transparent;
    border: 1px solid var(--border2);
    border-radius: 2px;
    color: var(--mid);
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.76rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
  }
  .zk-skip:hover {
    background: rgb(var(--c-glass) / 0.06);
    color: var(--text);
    border-color: var(--text);
  }

  @media (prefers-reduced-motion: reduce) {
    .zk-input-row,
    .zk-suggestions {
      animation: none !important;
    }
  }
</style>
