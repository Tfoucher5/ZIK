<script>
  import SpecialsInfo from './SpecialsInfo.svelte';
  import { FREE_MAX_TEAMS } from '$lib/data/proPlans.js';
  import { SALON_ROUNDS, SALON_DURATIONS, SALON_REVEALS, SALON_TEAMS } from '$lib/data/salonOptions.js';

  let {
    maxRounds = $bindable(),
    roundDuration = $bindable(),
    answerMode = $bindable(),
    manualNext = $bindable(),
    showAnswerDuration = $bindable(),
    specials = $bindable(),
    teamCount,
    pro,
    onPickTeams,
    onUpsell,
  } = $props();

  const proOnly = (feature, fn) => (pro ? fn() : onUpsell(feature));
</script>

{#snippet segmented(options, value, set, unit = '')}
  <div class="st-seg" role="radiogroup">
    {#each options as o (o)}
      <button type="button" role="radio" aria-checked={value === o} class:on={value === o} onclick={() => set(o)}>{o}{unit}</button>
    {/each}
  </div>
{/snippet}

<dl class="st-sheet">
  <div>
    <dt>Manches</dt>
    <dd>{@render segmented(SALON_ROUNDS, maxRounds, v => (maxRounds = v))}</dd>
  </div>
  <div>
    <dt>Temps pour répondre</dt>
    <dd>{@render segmented(SALON_DURATIONS, roundDuration, v => (roundDuration = v), ' s')}</dd>
  </div>
  <div>
    <dt>Réponses</dt>
    <dd>
      <div class="st-seg st-seg-wide" role="radiogroup">
        <button type="button" role="radio" aria-checked={answerMode === 'free'} class:on={answerMode === 'free'} onclick={() => (answerMode = 'free')}>
          Texte libre<small>Pour les connaisseurs</small>
        </button>
        <button type="button" role="radio" aria-checked={answerMode === 'multiple'} class:on={answerMode === 'multiple'} onclick={() => (answerMode = 'multiple')}>
          4 choix<small>Tout le monde joue</small>
        </button>
        <button type="button" role="radio" aria-checked={answerMode === 'buzzer'} class:on={answerMode === 'buzzer'} class:st-pro={!pro} onclick={() => proOnly('buzzer', () => (answerMode = 'buzzer'))}>
          Buzzer<small>L'animateur valide à voix haute</small>
        </button>
      </div>
    </dd>
  </div>
  <div>
    <dt>Manches spéciales<SpecialsInfo /></dt>
    <dd>
      <div class="st-seg st-seg-wide" role="radiogroup">
        <button type="button" role="radio" aria-checked={!specials} class:on={!specials} onclick={() => (specials = false)}>Non</button>
        <button type="button" role="radio" aria-checked={specials} class:on={specials} class:st-pro={!pro} onclick={() => proOnly('specials', () => (specials = true))}>
          Au hasard<small>Points doubles, intro éclair, sprint</small>
        </button>
      </div>
    </dd>
  </div>
  <div>
    <dt>Manche suivante</dt>
    <dd>
      <div class="st-seg st-seg-wide" role="radiogroup">
        <button type="button" role="radio" aria-checked={!manualNext} class:on={!manualNext} onclick={() => (manualNext = false)}>Automatique</button>
        <button type="button" role="radio" aria-checked={manualNext} class:on={manualNext} onclick={() => (manualNext = true)}>Quand je clique</button>
      </div>
    </dd>
  </div>
  <div>
    <dt>Équipes</dt>
    <dd>
      <div class="st-seg st-seg-wide" role="radiogroup">
        {#each SALON_TEAMS as n (n)}
          <button type="button" role="radio" aria-checked={teamCount === n} class:on={teamCount === n} class:st-pro={!pro && n > FREE_MAX_TEAMS} onclick={() => onPickTeams(n)}>{n === 0 ? 'Chacun pour soi' : n === 2 ? '2 équipes' : n}</button>
        {/each}
      </div>
      {#if pro}
        <label class="st-autre">Autre nombre
          <input type="number" min="2" max="100" value={SALON_TEAMS.includes(teamCount) ? '' : teamCount}
            onchange={(e) => onPickTeams(Math.round(+e.currentTarget.value) || 0)}>
        </label>
      {/if}
    </dd>
  </div>
  {#if !manualNext}
    <div>
      <dt>Réponse affichée</dt>
      <dd>{@render segmented(SALON_REVEALS, showAnswerDuration, v => (showAnswerDuration = v), ' s')}</dd>
    </div>
  {/if}
</dl>

<style>
  .st-sheet { display: flex; flex-direction: column; }
  .st-sheet > div {
    display: grid;
    grid-template-columns: 180px 1fr;
    align-items: center;
    gap: 12px 20px;
    padding: 14px 0;
    border-bottom: 1px dashed var(--border);
  }
  .st-sheet > div:first-child { padding-top: 0; }
  .st-sheet > div:last-child { border-bottom: 0; }
  .st-sheet dt { font-size: 0.9rem; color: var(--mid); }

  .st-seg {
    display: inline-flex;
    flex-wrap: wrap;
    border: 1px solid var(--border2);
    border-radius: 3px;
  }
  .st-seg button {
    min-width: 58px;
    padding: 9px 14px;
    background: none;
    border: 0;
    border-right: 1px solid var(--border2);
    color: var(--text);
    font: inherit;
    font-family: var(--s-mono);
    font-size: 0.82rem;
    cursor: pointer;
  }
  .st-seg button:last-child { border-right: 0; }
  .st-seg button:hover:not(.on) { background: var(--surface2); }
  .st-seg button.on { background: var(--text); color: var(--bg); }
  .st-seg-wide button {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 10px 16px;
    font-family: inherit;
    font-weight: 600;
    text-align: left;
  }
  .st-seg-wide small { font-weight: 400; font-size: 0.74rem; opacity: 0.65; }

  .st-seg button.st-pro:not(.on) { color: var(--dim); }
  /* Un point magenta ne disait rien : étiquette explicite. */
  .st-seg button.st-pro::after {
    content: 'Pro';
    margin-left: 7px;
    padding: 2px 6px;
    border-radius: 2px;
    background: rgb(var(--accent-rgb) / 0.16);
    color: var(--accent);
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .st-autre { display: inline-flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 0.82rem; color: var(--mid); }
  .st-autre input {
    width: 72px; padding: 8px; border: 1px solid var(--border2); border-radius: 2px;
    background: var(--bg2); color: var(--text); font: inherit;
  }

  @media (max-width: 760px) {
    .st-sheet > div { grid-template-columns: 1fr; gap: 8px; }
  }
</style>
