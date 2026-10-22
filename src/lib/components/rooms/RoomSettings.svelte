<script>
  import { PRESETS, presetOf, maxRounds, estimateMinutes, cardsCheck, ROUNDS_MIN } from '$lib/shared/rooms/settings.js';

  let { value = $bindable(), trackCount, hasPlaylists } = $props();

  const max = $derived(maxRounds(trackCount));
  const sliders = $derived([
    { key: 'rounds', label: 'Manches', min: ROUNDS_MIN, max, step: 1, unit: '' },
    { key: 'duration', label: 'Durée d\'une manche', min: 10, max: 60, step: 5, unit: ' s' },
    { key: 'pause', label: 'Pause entre titres', min: 3, max: 15, step: 1, unit: ' s' },
  ]);
  const preset = $derived(presetOf(value));
  const minutes = $derived(estimateMinutes(value));
  const cards = $derived(cardsCheck(trackCount, value.rounds));

  function apply(p) {
    value = { rounds: Math.min(p.rounds, max), duration: p.duration, pause: p.pause };
  }

  const pct = (s) => (s.max > s.min ? ((value[s.key] - s.min) / (s.max - s.min)) * 100 : 100);
</script>

<div class="rs">
  <span class="rs-label">Réglages</span>
  <div class="rs-presets" role="radiogroup" aria-label="Préréglages">
    {#each PRESETS as p (p.key)}
      <button role="radio" aria-checked={preset === p.key} class:on={preset === p.key} onclick={() => apply(p)}>
        <strong>{p.label}</strong><span>{p.hint}</span>
      </button>
    {/each}
  </div>

  {#each sliders as s (s.key)}
    <label class="rs-slider">
      <span class="rs-head"><span>{s.label}</span><b>{value[s.key]}{s.unit}</b></span>
      <input type="range" min={s.min} max={s.max} step={s.step} bind:value={value[s.key]} style="--p:{pct(s)}%">
    </label>
  {/each}
  {#if hasPlaylists && max < 50}<p class="rs-note">Maximum {max} manches : une par titre de tes playlists.</p>{/if}

  <div class="rs-sum">
    <span>≈ {minutes} min de partie</span>
    {#if hasPlaylists}
      {#if cards.ok}
        <span class="rs-cards ok">✓ On peut y gagner des cartes</span>
      {:else}
        <span class="rs-cards">Pas de cartes : il faut
          {#if cards.missingTracks}{cards.missingTracks} titres de plus{/if}{#if cards.missingTracks && cards.missingRounds} et {/if}{#if cards.missingRounds}{cards.missingRounds} manche{cards.missingRounds > 1 ? 's' : ''} de plus{/if}</span>
      {/if}
    {/if}
  </div>
</div>

<style>
  .rs { display: flex; flex-direction: column; gap: 10px; }
  .rs-label { margin-top: 4px; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
  .rs-presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .rs-presets button {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 7px 8px;
    border: 1px solid var(--border2);
    border-radius: 10px;
    background: none;
    color: var(--text);
    cursor: pointer;
  }
  .rs-presets button.on { border-color: var(--accent); background: rgb(var(--accent-rgb) / 0.1); }
  .rs-presets strong { font-size: 0.82rem; }
  .rs-presets span { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.64rem; color: var(--dim); }
  .rs-slider { display: flex; flex-direction: column; gap: 4px; }
  .rs-head { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--mid); }
  .rs-head b { font-family: "JetBrains Mono", ui-monospace, monospace; color: var(--accent); }
  .rs-slider input { -webkit-appearance: none; appearance: none; width: 100%; height: 22px; background: transparent; cursor: pointer; }
  .rs-slider input::-webkit-slider-runnable-track { height: 5px; border-radius: 999px; background: linear-gradient(to right, var(--accent) var(--p), rgb(var(--c-glass) / 0.12) var(--p)); }
  .rs-slider input::-webkit-slider-thumb { -webkit-appearance: none; width: 17px; height: 17px; margin-top: -6px; border-radius: 50%; background: #fff; border: 4px solid var(--accent); }
  .rs-slider input::-moz-range-track { height: 5px; border-radius: 999px; background: rgb(var(--c-glass) / 0.12); }
  .rs-slider input::-moz-range-progress { height: 5px; border-radius: 999px; background: var(--accent); }
  .rs-slider input::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%; background: #fff; border: 4px solid var(--accent); }
  .rs-note { margin: -4px 0 0; font-size: 0.7rem; color: var(--dim); }
  .rs-sum {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 12px;
    padding: 9px 12px;
    border-radius: 10px;
    background: rgb(var(--c-glass) / 0.04);
    font-size: 0.76rem;
    color: var(--mid);
  }
  .rs-cards { color: var(--dim); }
  .rs-cards.ok { color: var(--rarity-epic); font-weight: 700; }
</style>
