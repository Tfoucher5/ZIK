<script>
  import CloseEvening from './CloseEvening.svelte';
  import MediaCheck from './MediaCheck.svelte';
  import { radioGroup } from '#lib/components/ui/radioGroup.js';
  import { FREE_MAX_TEAMS } from '#lib/data/proPlans.js';
  import { SALON_ROUNDS, SALON_DURATIONS, SALON_REVEALS, SALON_TEAMS, teamColor } from '#lib/data/salonOptions.js';
  import { resumeReglages } from './onglets.js';
  import { ecranLarge } from './large.svelte.js';

  /**
   * Onglet « Réglages » : les quatre lignes de la création (musique, manches,
   * réponses, équipes), puis la soirée (`children`) et sa fermeture. En partie,
   * le mode de réponse et le nombre d'équipes attendent la partie suivante.
   *
   * @type {{
   *   settings: any, phase: string, round: number, pro: boolean, mediaCheck: any,
   *   playlistNames: string[], jouables?: { t: number, m: number, court: boolean },
   *   onSet: (patch: any) => void,
   *   onSound: (patch: any) => void,
   *   onRenameTeam: (team: number, name: string) => void,
   *   onUpsell: (f: string) => void,
   *   onOpenPlaylists: () => void,
   *   onClose: () => void,
   *   children?: import('svelte').Snippet,
   * }}
   */
  let { settings, phase, round, pro, mediaCheck, playlistNames = [], jouables = null, onSet, onSound, onRenameTeam, onUpsell, onOpenPlaylists, onClose, children } = $props();

  const idle = $derived(phase === 'lobby' || phase === 'gameover');
  const r = $derived(resumeReglages(settings, playlistNames, jouables?.court ? jouables.t : null));
  const nbEquipes = $derived(settings.teams?.length ?? 0);
  const reste = $derived(Math.max(0, (settings.rounds ?? settings.maxRounds ?? 0) - round));
  const PLUS = SALON_TEAMS.filter((n) => n > FREE_MAX_TEAMS);

  // En 1024 px tout est déplié ; au téléphone, la ligne utile du moment
  const ecran = ecranLarge();
  const ouvert = (n) => ecran.large || (idle ? n === '02' : n !== '01' && n !== '02');

  const equipes = (n) => (!pro && n > FREE_MAX_TEAMS ? onUpsell('teams') : onSet({ teamCount: n }));
</script>

{#snippet seg(label, options, value, set, unit = '', locked = () => false, disabled = () => false)}
  <div class="rg-seg" role="radiogroup" {@attach radioGroup} aria-label={label}>
    {#each options as o (o)}
      <button type="button" role="radio" aria-checked={value === o} class:verrou={locked(o)} disabled={disabled(o)} onclick={() => set(o)}>{o}{unit}</button>
    {/each}
  </div>
{/snippet}

{#snippet ouiNon(label, on, set, pro = false)}
  <div class="rg-reg fil">
    <span>{label}{#if pro}<span class="pro-tag">ZIK Pro</span>{/if}</span>
    {@render seg(label, ['Oui', 'Non'], on ? 'Oui' : 'Non', (v) => set(v === 'Oui'))}
  </div>
{/snippet}

{#snippet ligne(n, titre, sous, corps)}
  <details class="rg-plus" open={ouvert(n)}>
    <summary><span class="n">{n}</span><span><b>{titre}</b><small class:ts-court={n === '02' && jouables?.court}>{sous}</small></span></summary>
    {@render corps()}
  </details>
{/snippet}

{#snippet fige(label, valeur)}
  <div class="rg-reg fil"><span>{label}</span><p class="rg-fige"><b>{valeur}</b>Entre deux parties</p></div>
{/snippet}

<p class="ts-note">
  {idle
    ? 'Les changements prennent effet à la prochaine partie. Pas besoin de nouvelle soirée : les joueurs restent.'
    : 'Les changements prennent effet dès la manche suivante.'}
</p>

<div class="ts">
  <div class="ts-col">
    {#snippet musique()}
      <div class="rg-reg">
        {#if idle}<MediaCheck check={mediaCheck} />{:else}<p class="ts-mu">Le changement vaut pour les {reste} manches qui restent.</p>{/if}
        <button class="rg-em ts-em" type="button" onclick={onOpenPlaylists}>Changer de playlist</button>
      </div>
    {/snippet}
    {@render ligne('01', 'La musique', r.musique, musique)}

    {#snippet manches()}
      <div class="rg-reg"><span>Manches</span>{@render seg('Manches', SALON_ROUNDS, settings.maxRounds, (n) => onSet({ maxRounds: n }), '', () => false, (n) => !idle && n < round)}</div>
      {#if idle && jouables?.court}
        <div class="rg-reg ts-alerte" role="status">
          <p><b>Ta sélection a {jouables.t} titre{jouables.t > 1 ? 's' : ''} :</b> la partie fera {jouables.t} manche{jouables.t > 1 ? 's' : ''}.</p>
          <button class="rg-em" type="button" onclick={onOpenPlaylists}>Ajouter une playlist</button>
        </div>
      {/if}
      <div class="rg-reg"><span>Temps pour répondre</span>{@render seg('Temps pour répondre', SALON_DURATIONS, settings.roundDuration, (n) => onSet({ roundDuration: n }), ' s')}</div>
      <div class="rg-reg">
        <span>Manche suivante</span>
        {@render seg('Manche suivante', ['Automatique', 'Quand je clique'], settings.manualNext ? 'Quand je clique' : 'Automatique', (v) => onSet({ manualNext: v !== 'Automatique' }))}
      </div>
      {#if !settings.manualNext}
        <div class="rg-reg"><span>Réponse affichée</span>{@render seg('Réponse affichée', SALON_REVEALS, settings.showAnswerDuration, (n) => onSet({ showAnswerDuration: n }), ' s')}</div>
      {/if}
      {@render ouiNon('Décompte avant la partie', settings.countStart !== false, (v) => onSound({ countStart: v }))}
      {#if !settings.manualNext}
        {@render ouiNon('Décompte avant le titre suivant', settings.countNext !== false, (v) => onSound({ countNext: v }))}
      {/if}
    {/snippet}
    {@render ligne('02', 'Les manches', r.manches, manches)}
  </div>

  <div class="ts-col">
    {#snippet reponses()}
      {#if idle}
        <div class="rg-reg">
          <span>Mode de réponse</span>
          {@render seg('Mode de réponse', ['4 choix', 'Texte libre', 'Buzzer'], r.mode,
            (v) => (v === 'Buzzer' ? (pro ? onSet({ answerMode: 'buzzer' }) : onUpsell('buzzer')) : onSet({ answerMode: v === '4 choix' ? 'multiple' : 'free' })),
            '', (v) => v === 'Buzzer' && !pro)}
        </div>
      {:else}
        {@render fige('Mode de réponse', r.mode)}
      {/if}
      {#if settings.answerMode === 'buzzer'}
        {@render ouiNon('Son du buzz', settings.buzzSound !== false, (v) => onSound({ buzzSound: v }))}
      {/if}
      <div class="rg-reg fil">
        <span>Manches spéciales <span class="pro-tag">ZIK Pro</span></span>
        {@render seg('Manches spéciales', ['Non', 'Au hasard'], settings.specials ? 'Au hasard' : 'Non',
          (v) => (v === 'Non' ? onSet({ specials: false }) : pro ? onSet({ specials: true }) : onUpsell('specials')),
          '', (v) => v !== 'Non' && !pro)}
        <small>Points doubles, intro éclair, sprint : environ une manche sur quatre.</small>
      </div>
    {/snippet}
    {@render ligne('03', 'Les réponses', r.reponses, reponses)}

    {#snippet equipesCorps()}
      {#if idle}
        <div class="rg-reg">
          <span>Nombre d'équipes</span>
          {@render seg("Nombre d'équipes", ['Chacun pour soi', '2 équipes'], nbEquipes === 0 ? 'Chacun pour soi' : nbEquipes === 2 ? '2 équipes' : null,
            (v) => equipes(v === '2 équipes' ? 2 : 0))}
          {@render seg("Plus d'équipes", PLUS, nbEquipes, equipes, '', () => !pro)}
          {#if pro}
            <label class="ts-autre">Autre nombre
              <input type="number" min="2" max="100" placeholder="2 à 100" value={SALON_TEAMS.includes(nbEquipes) ? '' : nbEquipes}
                onchange={(e) => onSet({ teamCount: Math.round(+e.currentTarget.value) || 0 })}>
            </label>
          {/if}
        </div>
      {:else}
        {@render fige("Nombre d'équipes", nbEquipes ? `${nbEquipes} équipes` : 'Chacun pour soi')}
      {/if}
      {#if settings.teams}
        <div class="rg-reg">
          <span>Noms des équipes <span class="pro-tag">ZIK Pro</span></span>
          <div class="ts-noms">
            {#each settings.teams as t (t.id)}
              <input style="--tc:{teamColor(t.id)}" value={t.name} maxlength="24" readonly={!pro} aria-label="Nom de l'équipe {t.name}"
                onclick={() => { if (!pro) onUpsell('teamEdit'); }}
                onchange={(e) => onRenameTeam(t.id, e.currentTarget.value)}>
            {/each}
          </div>
        </div>
      {/if}
    {/snippet}
    {@render ligne('04', 'Les équipes', r.equipes, equipesCorps)}

    {@render children?.()}
    {#if idle}
      {@render ouiNon('Roulement de tambour', settings.finaleSound !== false, (v) => (pro ? onSound({ finaleSound: v }) : onUpsell('night')), true)}
    {/if}
    <CloseEvening {onClose} />
  </div>
</div>

<style>
  .ts-court { color: var(--warn); }
  .ts-alerte { padding: 12px 14px; border-radius: 14px; border: 1px solid rgb(255 179 71 / 0.5); background: rgb(255 179 71 / 0.08); }
  .ts-alerte p { margin: 0; font-size: 0.94rem; line-height: 1.4; }
  .ts-alerte b { color: var(--warn); }
  .ts-note { padding-bottom: 12px; font-size: 14px; line-height: 1.4; color: var(--muted); border-bottom: 1px solid var(--line-2); }
  .ts { display: grid; }
  .ts-col { display: grid; align-content: start; min-width: 0; }
  .ts-mu { font-size: 15px; line-height: 1.3; color: var(--soft); }
  .ts-em { justify-self: start; }
  .ts-autre { display: flex; align-items: center; gap: 10px; font-size: 15px; color: var(--muted); }
  .ts-autre input, .ts-noms input {
    min-width: 0; height: 48px; padding: 0 12px; border: 1px solid var(--line-2); border-radius: 12px;
    background: rgb(255 255 255 / 0.06); color: var(--text); font: inherit; font-size: 16px; font-weight: 600;
  }
  .ts-autre input { width: 108px; }
  .ts-noms { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .ts-noms input { border-left: 4px solid var(--tc); }

  @media (min-width: 900px) {
    .ts { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 44px; }
    .ts-noms { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
</style>
