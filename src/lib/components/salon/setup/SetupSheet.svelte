<script>
  import SetupBlock from './SetupBlock.svelte';
  import { radioGroup } from '#lib/components/ui/radioGroup.js';
  import { FREE_MAX_TEAMS } from '#lib/data/proPlans.js';
  import { SALON_ROUNDS, SALON_DURATIONS, SALON_REVEALS, SALON_TEAMS } from '#lib/data/salonOptions.js';

  /** @type {{ s: import('./salonSetup.svelte.js').SalonSetup }} */
  let { s } = $props();

  const MODES = [
    ['multiple', '4 choix', 'Tout le monde joue'],
    ['free', 'Texte libre', 'Pour les connaisseurs'],
    ['buzzer', 'Buzzer', "L'animateur valide à voix haute"],
  ];
  const MORE_TEAMS = SALON_TEAMS.filter((n) => n > FREE_MAX_TEAMS);

  const pickMode = (m) => (m === 'buzzer' ? s.proOnly('buzzer', () => (s.answerMode = m)) : (s.answerMode = m));
  const resume = $derived(
    [s.title.trim(), `${s.roundDuration} s pour répondre`, s.manualNext ? 'suite quand tu cliques' : 'suite automatique',
      !s.manualNext && `réponse affichée ${s.showAnswerDuration} s`, s.specials && 'manches spéciales']
      .filter(Boolean).join(' · ')
  );
</script>

{#snippet seg(label, options, value, set, unit = '', locked = () => false)}
  <div class="seg" role="radiogroup" {@attach radioGroup} aria-label={label}>
    {#each options as o (o)}
      <button type="button" role="radio" aria-checked={value === o} class:verrou={locked(o)} onclick={() => set(o)}>{o}{unit}</button>
    {/each}
  </div>
{/snippet}

<SetupBlock n="02" title="Les manches">
  {@render seg('Nombre de manches', SALON_ROUNDS, s.maxRounds, (v) => (s.maxRounds = v))}
</SetupBlock>

<SetupBlock n="03" title="Les réponses">
  <div class="choix" role="radiogroup" {@attach radioGroup} aria-label="Mode de réponse">
    {#each MODES as [id, titre, sous] (id)}
      <button type="button" role="radio" aria-checked={s.answerMode === id} class:verrou={id === 'buzzer' && !s.pro} onclick={() => pickMode(id)}>
        <b>{titre}{#if id === 'buzzer'}<span class="pro-tag">ZIK Pro</span>{/if}</b><small>{sous}</small>
      </button>
    {/each}
  </div>
</SetupBlock>

<SetupBlock n="04" title="Les équipes">
  <div class="choix deux" role="radiogroup" {@attach radioGroup} aria-label="Équipes">
    <button type="button" role="radio" aria-checked={s.teamCount === 0} onclick={() => s.pickTeams(0)}><b>Chacun pour soi</b></button>
    <button type="button" role="radio" aria-checked={s.teamCount === 2} onclick={() => s.pickTeams(2)}><b>2 équipes</b></button>
  </div>
  <div class="plus-eq">
    <p>Plus d'équipes <span class="pro-tag">ZIK Pro</span>{#if !s.pro}<span>Autant d'équipes que tu veux, une par table.</span>{/if}</p>
    {@render seg("Plus d'équipes", MORE_TEAMS, s.teamCount, (n) => s.pickTeams(n), '', () => !s.pro)}
    {#if s.pro}
      <label class="autre">Autre nombre
        <input type="number" min="2" max="100" value={SALON_TEAMS.includes(s.teamCount) ? '' : s.teamCount}
          onchange={(e) => s.pickTeams(Math.round(+e.currentTarget.value) || 0)}>
      </label>
    {/if}
  </div>
</SetupBlock>

<details class="plus">
  <summary><span><b>Plus de réglages</b><small>{resume}</small></span></summary>
  <label class="reg">
    <span>Nom de la soirée <i>facultatif</i></span>
    <input class="nom" type="text" maxlength="30" autocomplete="off" placeholder="Ex. : Quiz du jeudi" bind:value={s.title}>
    <small>Il s'affiche sur l'image que les joueurs partagent en fin de partie. Sans nom, la date.</small>
  </label>
  <div class="reg"><span>Temps pour répondre</span>{@render seg('Temps pour répondre', SALON_DURATIONS, s.roundDuration, (v) => (s.roundDuration = v), ' s')}</div>
  <div class="reg">
    <span>Manche suivante</span>
    <div class="seg" role="radiogroup" {@attach radioGroup} aria-label="Manche suivante">
      <button type="button" role="radio" aria-checked={!s.manualNext} onclick={() => (s.manualNext = false)}>Automatique</button>
      <button type="button" role="radio" aria-checked={s.manualNext} onclick={() => (s.manualNext = true)}>Quand je clique</button>
    </div>
  </div>
  {#if !s.manualNext}
    <div class="reg"><span>Réponse affichée</span>{@render seg('Réponse affichée', SALON_REVEALS, s.showAnswerDuration, (v) => (s.showAnswerDuration = v), ' s')}</div>
  {/if}
  <div class="reg">
    <span>Manches spéciales <span class="pro-tag">ZIK Pro</span></span>
    <div class="seg" role="radiogroup" {@attach radioGroup} aria-label="Manches spéciales">
      <button type="button" role="radio" aria-checked={!s.specials} onclick={() => (s.specials = false)}>Non</button>
      <button type="button" role="radio" aria-checked={s.specials} class:verrou={!s.pro} onclick={() => s.proOnly('specials', () => (s.specials = true))}>Au hasard</button>
    </div>
    <small>Points doubles, intro éclair, sprint : environ une manche sur quatre.</small>
  </div>
</details>

<style>
  .seg {
    display: flex;
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--line-2);
    border-radius: 999px;
    background: var(--surface);
  }
  .seg button {
    flex: 1;
    min-height: 44px;
    padding: 0 6px;
    border: 0;
    border-radius: 999px;
    background: none;
    color: var(--text);
    font-family: var(--mono);
    font-weight: 700;
    font-size: 15px;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.25s, color 0.25s;
  }
  .seg [aria-checked='true'], .choix [aria-checked='true'] { background: var(--text); color: #000; border-color: var(--text); }
  .verrou:not([aria-checked='true']) { color: var(--muted); }

  .choix { display: grid; gap: 8px; }
  .choix button {
    display: grid;
    gap: 3px;
    align-content: center;
    min-height: 64px;
    padding: 10px 18px;
    border: 1px solid var(--line-2);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.035);
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.25s, color 0.25s, border-color 0.25s;
  }
  .choix b { display: flex; align-items: center; gap: 10px; font-family: var(--titre); font-weight: 800; font-size: 1.4rem; line-height: 1; text-transform: uppercase; }
  .choix small { font-size: 14px; line-height: 1.3; color: var(--muted); }
  .choix [aria-checked='true'] small { color: #33343d; }
  .choix.deux { grid-template-columns: 1fr 1fr; }
  .choix.deux button { min-height: 52px; padding: 10px 14px; }
  .choix.deux b { font-size: 1.2rem; white-space: nowrap; }
  .pro-tag { margin-left: 0; font-size: 12px; padding: 3px 8px; }

  .plus-eq { display: grid; gap: 8px; }
  .plus-eq > p { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; font-size: 15px; color: var(--muted); }
  .autre { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; color: var(--muted); }
  .autre input, .nom {
    width: 80px;
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--line-2);
    border-radius: 999px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
  }

  .plus { border-block: 1px solid var(--line-2); }
  .plus summary { display: flex; align-items: center; gap: 14px; min-height: 64px; padding: 10px 0; cursor: pointer; list-style: none; }
  .plus summary::-webkit-details-marker { display: none; }
  .plus summary b { display: block; font-family: var(--titre); font-weight: 700; font-size: 21px; line-height: 1.05; text-transform: uppercase; }
  .plus summary small { display: block; margin-top: 3px; font-size: 14px; line-height: 1.35; color: var(--muted); }
  .plus summary::after {
    content: '+';
    flex: none;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    margin-left: auto;
    border: 1px solid var(--line-2);
    border-radius: 50%;
    font-size: 20px;
    transition: transform 0.35s var(--out), background 0.25s, color 0.25s;
  }
  .plus[open] summary::after { transform: rotate(45deg); background: #fff; color: #000; }
  .plus::details-content { block-size: 0; overflow: clip; transition: block-size 0.45s var(--out), content-visibility 0.45s allow-discrete; }
  .plus[open]::details-content { block-size: auto; }
  .reg { display: grid; gap: 8px; padding: 14px 0; border-top: 1px solid var(--line); }
  .reg > span { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 15px; color: var(--muted); }
  .reg > small { font-size: 14px; color: var(--muted); }
  .reg i { font-size: 13px; }
  .nom { width: 100%; max-width: 420px; padding: 0 18px; }

  @media (min-width: 900px) {
    .choix { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .choix.deux { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 66.6%; }
    .choix.deux b { font-size: 1.4rem; }
    .reg { grid-template-columns: 220px minmax(0, 1fr); align-items: center; }
    .reg > small { grid-column: 2; }
  }
</style>
