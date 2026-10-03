<script>
  import { onMount } from 'svelte';
  import { THEMES, getTheme, setTheme } from '$lib/theme.js';

  /** @type {{ open: boolean, onToggle: (e: MouseEvent) => void }} */
  let { open = false, onToggle } = $props();

  let active = $state('light');

  onMount(() => { active = getTheme(); });

  function pick(id) {
    active = id;
    setTheme(id);
  }
</script>

<div class="tm-wrap">
  <button
    class="tm-btn"
    class:open
    onclick={onToggle}
    aria-haspopup="true"
    aria-expanded={open}
    aria-label="Changer de th&egrave;me"
    title="Th&egrave;me"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 000 18z" class="tm-btn-fill" />
    </svg>
  </button>

  <div class="tm-pop" class:open>
    <span class="tm-pop-head">Th&egrave;me</span>
    <div class="tm-grid">
      {#each THEMES as theme (theme.id)}
        <button
          class="tm-swatch"
          class:active={active === theme.id}
          style="--swatch-bg:{theme.bg};--swatch-accent:{theme.accent}"
          onclick={() => pick(theme.id)}
          aria-pressed={active === theme.id}
          title={theme.label}
        >
          <span class="tm-preview">
            <span class="tm-bar"></span>
            <span class="tm-dot"></span>
          </span>
          <span class="tm-label">{theme.label}</span>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .tm-wrap { position: relative; display: flex; }

  .tm-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    background: none;
    border: 1px solid rgb(var(--c-glass) / 0.1);
    border-radius: 2px;
    color: var(--mid);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .tm-btn:hover,
  .tm-btn.open { border-color: rgb(var(--c-glass) / 0.25); color: var(--text); }
  .tm-btn svg {
    width: 17px;
    height: 17px;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.7;
  }
  .tm-btn-fill { fill: currentColor; stroke: none; }

  .tm-pop {
    display: none;
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 300;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 2px;
    padding: 12px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
    flex-direction: column;
    gap: 10px;
  }
  .tm-pop.open { display: flex; }

  .tm-pop-head {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 0.6rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--dim);
  }

  .tm-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .tm-swatch {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    background: none;
    border: 2px solid var(--border);
    border-radius: 10px;
    padding: 6px;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.15s;
    font-family: inherit;
  }
  .tm-swatch:hover { border-color: var(--mid); transform: translateY(-2px); }
  .tm-swatch.active { border-color: var(--accent); }

  .tm-preview {
    width: 44px;
    height: 30px;
    border-radius: 6px;
    background: var(--swatch-bg);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    padding: 4px;
  }
  .tm-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 7px;
    background: var(--swatch-accent);
    opacity: 0.55;
  }
  .tm-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--swatch-accent);
    box-shadow: 0 0 6px var(--swatch-accent);
    margin-left: auto;
  }
  .tm-label {
    font-size: 0.64rem;
    font-weight: 600;
    color: var(--mid);
    letter-spacing: 0.3px;
  }
  .tm-swatch.active .tm-label { color: var(--accent); }

  /* En mobile le popover est ancré à droite du bandeau : on le laisse respirer */
  @media (max-width: 768px) {
    .tm-pop { right: -6px; padding: 10px; }
    .tm-preview { width: 40px; height: 27px; }
  }
</style>
