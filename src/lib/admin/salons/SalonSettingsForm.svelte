<script>
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { SALON_ROUNDS, SALON_DURATIONS, SALON_REVEALS, SALON_TEAMS } from '$lib/salonOptions.js';

  /** Réglages du salon en direct, appliqués comme depuis la régie. */
  let { s, busy, submit } = $props();

  const idle = $derived(s.phase === 'lobby' || s.phase === 'gameover');
  const minRounds = $derived(idle ? 0 : s.round);

  const pick = (x) => ({
    maxRounds: x.maxRounds,
    roundDuration: x.settings.roundDuration,
    manualNext: x.settings.manualNext ? '1' : '0',
    showAnswerDuration: x.settings.showAnswerDuration,
    answerMode: x.settings.answerMode,
    teamCount: x.settings.teams.length,
  });

  // La fiche se recharge toutes les 5 s : on ne touche pas à un choix en cours
  let dirty = $state(false);
  let v = $state(pick(untrack(() => s)));
  $effect(() => {
    const next = pick(s);
    if (!untrack(() => dirty)) v = next;
  });

  const send = (opts) => {
    const after = submit(opts);
    return async (res) => {
      await after(res);
      dirty = false;
    };
  };
</script>

<form class="a-form set" method="POST" action="?/settings" use:enhance={send} oninput={() => (dirty = true)}>
  <input type="hidden" name="code" value={s.code} />
  <p class="a-muted">
    {idle ? 'Pris en compte dès la prochaine partie.' : 'Pris en compte dès la manche suivante. Réponses et équipes se changent entre deux parties.'}
  </p>

  <label class="a-label">Manches
    <select class="a-select" name="maxRounds" bind:value={v.maxRounds}>
      {#each SALON_ROUNDS as n (n)}<option value={n} disabled={n < minRounds}>{n} manches</option>{/each}
    </select>
  </label>
  <label class="a-label">Temps pour répondre
    <select class="a-select" name="roundDuration" bind:value={v.roundDuration}>
      {#each SALON_DURATIONS as n (n)}<option value={n}>{n} s</option>{/each}
    </select>
  </label>
  <label class="a-label">Manche suivante
    <select class="a-select" name="manualNext" bind:value={v.manualNext}>
      <option value="0">Automatique</option>
      <option value="1">Quand l'hôte clique</option>
    </select>
  </label>
  <label class="a-label">Réponse affichée
    <select class="a-select" name="showAnswerDuration" bind:value={v.showAnswerDuration}>
      {#each SALON_REVEALS as n (n)}<option value={n}>{n} s</option>{/each}
    </select>
  </label>
  <label class="a-label">Réponses
    <select class="a-select" name="answerMode" bind:value={v.answerMode} disabled={!idle}>
      <option value="free">Texte libre</option>
      <option value="multiple">4 choix</option>
    </select>
  </label>
  <label class="a-label">Équipes
    <select class="a-select" name="teamCount" bind:value={v.teamCount} disabled={!idle}>
      {#each SALON_TEAMS as n (n)}<option value={n}>{n ? `${n} équipes` : 'Sans équipes'}</option>{/each}
    </select>
  </label>

  <button class="a-btn primary" disabled={busy}>Appliquer</button>
</form>

<style>
  .set { display: grid; gap: 10px; }
  @media (min-width: 600px) {
    .set { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .set p, .set button { grid-column: 1 / -1; }
  }
  .set p { font-size: 0.85rem; }
  .set label { display: grid; gap: 6px; }
  .set button { justify-self: start; }
</style>
