<script>
  import SpecialsInfo from '$lib/components/salon/setup/SpecialsInfo.svelte';
  import { FREE_MAX_TEAMS } from '$lib/data/proPlans.js';
  import { SALON_ROUNDS, SALON_DURATIONS, SALON_REVEALS, SALON_TEAMS, teamColor } from '$lib/data/salonOptions.js';

  /**
   * Onglet « Réglages ». Secondaire : la configuration se fait en amont sur
   * /salon, la régie sert à piloter. On garde la distinction existante entre
   * ce qui s'applique en direct et ce qui attend la fin de la partie.
   *
   * @type {{
   *   settings: any, phase: string, round: number, pro: boolean,
   *   onSet: (patch: any) => void,
   *   onRenameTeam: (team: number, name: string) => void,
   *   onUpsell: (f: string) => void,
   *   onOpenPlaylists: () => void, playlistNames: string[],
   * }}
   */
  let { settings, phase, round, pro, onSet, onRenameTeam, onUpsell, onOpenPlaylists, onSound, playlistNames = [] } = $props();

  const idle = $derived(phase === 'lobby' || phase === 'gameover');
</script>

{#if phase === 'gameover'}<h2 class="ts-titre">Partie suivante</h2>{/if}
<p class="ts-note">
  {idle
    ? 'Les changements prennent effet à la prochaine partie. Pas besoin de nouveau salon : les joueurs restent.'
    : 'Les changements prennent effet dès la manche suivante.'}
</p>

<div class="ts-field">
  <span>Playlist</span>
  <div class="ts-playlist">
    <p>{playlistNames.join(', ') || 'Sélection en cours'}</p>
    <button class="sx-btn" onclick={onOpenPlaylists}>Changer de playlist</button>
  </div>
</div>

<div class="ts-field">
  <span>Manches</span>
  <div class="ts-seg">
    {#each SALON_ROUNDS as n (n)}
      <button class:on={settings.maxRounds === n} disabled={!idle && n < round} onclick={() => onSet({ maxRounds: n })}>{n}</button>
    {/each}
  </div>
</div>

<div class="ts-field">
  <span>Temps pour répondre</span>
  <div class="ts-seg">
    {#each SALON_DURATIONS as n (n)}
      <button class:on={settings.roundDuration === n} onclick={() => onSet({ roundDuration: n })}>{n} s</button>
    {/each}
  </div>
</div>

<div class="ts-field">
  <span>Manche suivante</span>
  <div class="ts-seg">
    <button class:on={!settings.manualNext} onclick={() => onSet({ manualNext: false })}>Automatique</button>
    <button class:on={settings.manualNext} onclick={() => onSet({ manualNext: true })}>Quand je clique</button>
  </div>
</div>

{#if !settings.manualNext}
  <div class="ts-field">
    <span>Réponse affichée</span>
    <div class="ts-seg">
      {#each SALON_REVEALS as n (n)}
        <button class:on={settings.showAnswerDuration === n} onclick={() => onSet({ showAnswerDuration: n })}>{n} s</button>
      {/each}
    </div>
  </div>
{/if}

<div class="ts-field">
  <span>Réponses {#if !idle}<small>entre deux parties</small>{/if}</span>
  <div class="ts-seg">
    <button class:on={settings.answerMode === 'free'} disabled={!idle} onclick={() => onSet({ answerMode: 'free' })}>Texte libre</button>
    <button class:on={settings.answerMode === 'multiple'} disabled={!idle} onclick={() => onSet({ answerMode: 'multiple' })}>4 choix</button>
    <button class:on={settings.answerMode === 'buzzer'} class:ts-locked={!pro} disabled={!idle}
      onclick={() => (pro ? onSet({ answerMode: 'buzzer' }) : onUpsell('buzzer'))}>Buzzer{#if !pro}<i>Pro</i>{/if}</button>
  </div>
  {#if settings.answerMode === 'buzzer'}
    <div class="ts-son">
      <b>Son du buzz sur la TV</b>
      <div class="ts-seg">
        <button class:on={settings.buzzSound !== false} onclick={() => onSound({ buzzSound: true })}>Oui</button>
        <button class:on={settings.buzzSound === false} onclick={() => onSound({ buzzSound: false })}>Coupé</button>
      </div>
    </div>
  {/if}
</div>

<div class="ts-field">
  <span>Manches spéciales <small>au hasard</small><SpecialsInfo /></span>
  <div class="ts-seg">
    <button class:on={!settings.specials} onclick={() => onSet({ specials: false })}>Non</button>
    <button class:on={settings.specials} class:ts-locked={!pro}
      onclick={() => (pro ? onSet({ specials: true }) : onUpsell('specials'))}>Oui{#if !pro}<i>Pro</i>{/if}</button>
  </div>
</div>

<div class="ts-field">
  <span>Équipes {#if !idle}<small>entre deux parties</small>{/if}</span>
  <div class="ts-seg">
    {#each SALON_TEAMS as n (n)}
      {@const locked = !pro && n > FREE_MAX_TEAMS}
      <button
        class:on={(settings.teams?.length ?? 0) === n}
        class:ts-locked={locked}
        disabled={!idle}
        onclick={() => (locked ? onUpsell('teams') : onSet({ teamCount: n }))}
      >{n || 'Aucune'}{#if locked}<i>Pro</i>{/if}</button>
    {/each}
    {#if pro}
      <input class="ts-input ts-nombre" type="number" min="2" max="100" placeholder="Autre" disabled={!idle} aria-label="Autre nombre d'équipes"
        value={SALON_TEAMS.includes(settings.teams?.length ?? 0) ? '' : settings.teams.length}
        onchange={(e) => onSet({ teamCount: Math.round(+e.currentTarget.value) || 0 })}>
    {/if}
  </div>
</div>

{#if settings.teams}
  <div class="ts-field">
    <span>Noms des équipes</span>
    <div class="ts-teamnames">
      {#each settings.teams as t (t.id)}
        <input class="ts-input" style="--tc:{teamColor(t.id)}" value={t.name} maxlength="24" readonly={!pro}
          onclick={() => { if (!pro) onUpsell('teamEdit'); }}
          onchange={(e) => onRenameTeam(t.id, e.target.value)}>
      {/each}
    </div>
  </div>
{/if}

<style>
  .ts-titre { margin: 0 0 6px; font-size: 1.2rem; }
  .ts-note { font-size: 0.82rem; color: var(--dim); margin: 0 0 20px; }
  .ts-playlist { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .ts-playlist p { flex: 1; min-width: 160px; margin: 0; font-weight: 600; }

  .ts-field { margin-bottom: 20px; }
  .ts-field > span {
    display: block; font-size: 0.84rem; color: var(--mid); margin-bottom: 8px;
  }
  .ts-field > span small {
    font-size: 0.68rem; color: var(--dim); margin-left: 6px;
    text-transform: uppercase; letter-spacing: 0.1em;
  }

  .ts-seg { display: flex; flex-wrap: wrap; gap: 6px; }
  .ts-seg button {
    /* 44px : utilisable au doigt, la tablette est le support principal. */
    min-height: 44px;
    padding: 9px 16px; border-radius: 2px;
    border: 1px solid var(--border2); background: none; color: var(--mid);
    font-family: var(--s-mono); font-size: 0.82rem; cursor: pointer;
    display: inline-flex; align-items: center; gap: 7px;
    transition: border-color 0.15s, color 0.15s;
  }
  .ts-seg button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .ts-seg button.on { background: var(--text); color: var(--bg); border-color: var(--text); }
  .ts-seg button:disabled { opacity: 0.4; cursor: default; }

  /* Un point magenta sans légende ne disait rien : étiquette explicite. */
  .ts-seg button.ts-locked { border-style: dashed; }
  .ts-seg i {
    font-style: normal; font-size: 0.58rem; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 2px 6px; border-radius: 2px;
    background: rgb(var(--accent-rgb) / 0.16); color: var(--accent);
  }

  .ts-son { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
  .ts-son b { font-size: 0.9rem; font-weight: 600; }
  .ts-nombre { width: 90px; border-left-width: 1px; }
  .ts-teamnames { display: flex; flex-wrap: wrap; gap: 8px; }
  .ts-input {
    padding: 10px 12px; min-height: 44px; border-radius: 2px;
    border: 1px solid var(--border2); border-left: 3px solid var(--tc);
    background: var(--bg2); color: var(--text); font: inherit; font-size: 0.86rem;
    max-width: 180px;
  }
</style>
