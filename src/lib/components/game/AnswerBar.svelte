<script>
  // Zone de réponse : texte libre, ou 4 propositions en QCM
  let {
    gameMode, disabled, syncWaiting, syncReady, syncTotal,
    qcm, guessVal = $bindable(''), onGuess, onChoice,
  } = $props();

  function submitGuess() {
    const val = guessVal.trim();
    if (!val || disabled) return;
    onGuess(val);
    guessVal = '';
  }
</script>

<div class="g-input-bar" class:g-input-bar-qcm={gameMode === 'qcm' && qcm.choices.length > 0}>
  {#if syncWaiting}
    <div class="g-sync-waiting">
      &#x23F3; Chargement de la musique&hellip;
      {#if syncTotal > 1}<span class="g-sync-count">{syncReady}/{syncTotal}</span>{/if}
    </div>
  {/if}
  {#if gameMode === 'qcm' && qcm.choices.length > 0}
    <div class="g-qcm-grid">
      {#each qcm.choices as choice, i (i)}
        {@const isChosen = qcm.chosen === i}
        {@const isRevealing = qcm.reveal !== null}
        {@const isCorrect = isRevealing && i === qcm.reveal}
        {@const isWrong = isRevealing && isChosen && !isCorrect}
        {@const isNeutral = isRevealing && !isChosen && !isCorrect}
        <button
          class="g-qcm-btn g-qcm-{i}"
          class:g-qcm-selected={isChosen && !isRevealing}
          class:g-qcm-correct={isCorrect}
          class:g-qcm-wrong={isWrong}
          class:g-qcm-neutral={isNeutral}
          onclick={() => onChoice(i)}
          disabled={disabled || qcm.chosen !== null}
        >
          <span class="g-qcm-shape"></span>
          <span class="g-qcm-text">{choice}</span>
        </button>
      {/each}
    </div>
    <div class="g-qcm-status-bar">
      {#if qcm.chosen !== null && qcm.result !== null}
        {#if qcm.result.correct}
          <span class="g-qcm-pts-correct">+{qcm.result.pts} pts ✓</span>
        {:else}
          <span class="g-qcm-pts-wrong">+0 pt ✗</span>
        {/if}
      {:else if qcm.chosen !== null}
        <span class="g-qcm-locked">Réponse verrouillée…</span>
      {:else if qcm.reveal === null}
        <span class="g-qcm-hint">Choisis ta réponse !</span>
      {/if}
      {#if qcm.reveal === null && qcm.total > 1}
        <span class="g-qcm-count">{qcm.answered}/{qcm.total} répondu{qcm.answered > 1 ? 's' : ''}</span>
      {/if}
    </div>
  {:else if gameMode !== 'qcm'}
    <div class="g-input-wrap">
      <span class="g-input-prompt">&gt;</span>
      <input
        type="text"
        id="guessInput"
        class="g-input"
        placeholder="Artiste ou titre&hellip; tape ta r&eacute;ponse"
        disabled={disabled}
        bind:value={guessVal}
        autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" maxlength="100"
        onkeydown={e => { if (e.key === 'Enter') submitGuess(); }}
      >
      <button class="g-submit-btn" disabled={disabled} onclick={submitGuess}>Deviner</button>
    </div>
  {/if}
</div>
