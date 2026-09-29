<script>
  let {
    round = 0, total = 10,
    timerVal = 0, timerMax = 30, timerStarted = false,
    answerMode = 'free',
    choices = null,
    foundArtist = false,
    foundTitle = false,
    foundFeats = [],
    extras = [],
    foundExtras = [],
    allFound = false,
    chosenIndex = null,
    revealCorrectIndex = null,
    guess = $bindable(''),
    onSubmitGuess,
    onSubmitChoice,
  } = $props();

  let ratio = $derived(timerMax ? Math.max(0, timerVal / timerMax) : 1);
  let level = $derived(ratio >= 0.4 ? '' : ratio >= 0.2 ? 'warn' : 'danger');
</script>

<div class="sp-timer-row">
  <span class="sx-kicker">Manche <b>{round}</b> / {total}</span>
  {#if timerStarted}<span class="sp-timer {level}">{timerVal}</span>{/if}
</div>
<div class="sp-bar"><i style="width:{timerStarted ? ratio * 100 : 0}%"></i></div>

{#if !timerStarted}
  <div class="sp-center">
    <span class="sx-dots"><i></i><i></i><i></i></span>
    <p>La musique arrive sur la TV…</p>
  </div>

{:else if answerMode === 'free'}
  <div class="sp-chips">
    <span class="sp-chip" class:found={foundArtist}>Artiste</span>
    {#each foundFeats as ff, i (i)}
      <span class="sp-chip" class:found={ff}>Feat {i + 1}</span>
    {/each}
    <span class="sp-chip" class:found={foundTitle}>Titre</span>
    {#each extras as label, i (i)}
      <span class="sp-chip" class:found={foundExtras[i]}>{label}</span>
    {/each}
  </div>

  {#if allFound}
    <div class="sp-done">
      <div class="sp-big">Tout trouvé</div>
      <p>On attend les autres…</p>
    </div>
  {:else}
    <div class="sp-guess">
      <input
        id="salon-guess-input"
        type="text"
        bind:value={guess}
        placeholder="Artiste, titre, feat…"
        maxlength="100"
        autocomplete="off"
        spellcheck="false"
        onkeydown={e => { if (e.key === 'Enter') onSubmitGuess(); }}
      >
      <button class="sx-btn sx-btn-primary" onclick={onSubmitGuess} disabled={!guess.trim()}>OK</button>
    </div>
  {/if}

{:else if answerMode === 'multiple' && choices}
  {#if chosenIndex !== null && revealCorrectIndex === null}
    <!-- Réponse donnée : on la rappelle en petit, le classement prend la place -->
    <div class="sp-chosen">
      <div class="sx-choice c{chosenIndex}"><span class="sx-shape"></span>{choices[chosenIndex]}</div>
      <p class="sp-locked"><span class="sx-dots"><i></i><i></i><i></i></span> Réponse verrouillée</p>
    </div>
  {:else}
    <div class="sx-choices sp-drawer">
      {#each choices as choice, i (i)}
        {@const isChosen = chosenIndex === i}
        {@const isRevealing = revealCorrectIndex !== null}
        {@const isCorrect = isRevealing && i === revealCorrectIndex}
        <button
          class="sx-choice c{i}"
          class:reveal-correct={isCorrect}
          class:reveal-wrong={isRevealing && isChosen && !isCorrect}
          class:reveal-neutral={isRevealing && !isChosen && !isCorrect}
          onclick={() => onSubmitChoice(i)}
          disabled={allFound}
        >
          <span class="sx-shape"></span>{choice}
        </button>
      {/each}
    </div>
  {/if}
{/if}
