<script>
  import { SPECIALS } from '$lib/data/salonOptions.js';

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
    special = null,
    specialIntro = false,
    buzzer = null,
    buzzLocked = false,
    username = '',
    onSubmitGuess,
    onSubmitChoice,
    onBuzz,
  } = $props();

  let ratio = $derived(timerMax ? Math.max(0, timerVal / timerMax) : 1);
  let level = $derived(ratio >= 0.4 ? '' : ratio >= 0.2 ? 'warn' : 'danger');
</script>

<div class="sp-timer-row">
  <span class="sx-kicker">Manche <b>{round}</b> / {total}</span>
  {#if timerStarted}<span class="sp-timer {level}">{timerVal}</span>{/if}
</div>
<div class="sp-bar"><i style="width:{timerStarted ? ratio * 100 : 0}%"></i></div>
{#if special}<p class="sp-special">Manche spéciale · {SPECIALS[special].label}</p>{/if}
{#if specialIntro && special}
  <div class="sp-special-intro" role="status">
    <p class="sx-kicker">Attention</p>
    <div class="sp-big">Manche spéciale</div>
    <b>{SPECIALS[special].label}</b>
    <p>{SPECIALS[special].hint}</p>
  </div>
{/if}

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

{:else if answerMode === 'buzzer'}
  <div class="sp-buzz-zone">
    {#if allFound}
      <div class="sp-big">Bien joué !</div>
    {:else if buzzer}
      <div class="sp-big">{buzzer === username ? 'À toi ! Réponds à voix haute' : `${buzzer} a buzzé`}</div>
    {:else if buzzLocked}
      <p>Raté pour cette manche. Prochaine chance à la suivante.</p>
    {:else}
      <button class="sp-buzz" onclick={onBuzz} aria-label="Buzzer"><span class="sp-buzz-cap">Buzz</span></button>
    {/if}
  </div>

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

<style>
  .sp-special {
    margin: 10px 0 0;
    padding: 8px 12px;
    background: var(--accent);
    color: #000;
    font-family: var(--s-cond);
    font-weight: 800;
    text-transform: uppercase;
    text-align: center;
  }
  .sp-special-intro {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 24px;
    background: radial-gradient(circle at 50% 50%, rgb(var(--accent-rgb) / 0.35), var(--bg) 75%);
    text-align: center;
    animation: sp-intro 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.3);
  }
  .sp-special-intro b {
    padding: 8px 18px;
    background: var(--accent);
    color: #000;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 2.4rem;
    text-transform: uppercase;
  }
  .sp-special-intro p:not(.sx-kicker) { color: var(--mid); }
  @keyframes sp-intro {
    from { opacity: 0; transform: scale(0.85); }
  }
  .sp-buzz-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    min-height: 50vh;
    text-align: center;
  }
  .sp-buzz-zone p { color: var(--mid); }
  /* Bouton d'arcade : boîtier métal, dôme rouge en relief qui s'enfonce */
  .sp-buzz {
    --d: 18px;
    width: min(72vw, 290px);
    aspect-ratio: 1;
    padding: 16px 16px calc(16px + var(--d));
    border: 0;
    border-radius: 50%;
    background:
      radial-gradient(circle at 50% 35%, #4a4f57 0%, #22252a 60%, #0d0e10 100%);
    box-shadow:
      0 18px 34px rgb(0 0 0 / 0.55),
      inset 0 2px 2px rgb(255 255 255 / 0.18),
      inset 0 -6px 12px rgb(0 0 0 / 0.6);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .sp-buzz-cap {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 28%, #ff7b7b 0%, #f2232d 32%, #b80f19 72%, #7d0710 100%);
    box-shadow:
      0 var(--d) 0 #6d050c,
      0 calc(var(--d) + 6px) 14px rgb(0 0 0 / 0.55),
      inset 0 -10px 22px rgb(80 0 6 / 0.55),
      inset 0 6px 10px rgb(255 190 190 / 0.35);
    color: #fff;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: clamp(2.4rem, 12vw, 3.4rem);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-shadow: 0 2px 0 #7d0710, 0 4px 10px rgb(0 0 0 / 0.4);
    transition: transform 0.07s ease-out, box-shadow 0.07s ease-out;
  }
  /* Reflet brillant sur le haut du dôme */
  .sp-buzz-cap::before {
    content: '';
    position: absolute;
    top: 8%;
    left: 20%;
    width: 46%;
    height: 26%;
    border-radius: 50%;
    background: linear-gradient(180deg, rgb(255 255 255 / 0.55), rgb(255 255 255 / 0));
    transform: rotate(-18deg);
  }
  .sp-buzz:active .sp-buzz-cap {
    transform: translateY(calc(var(--d) - 4px));
    box-shadow:
      0 4px 0 #6d050c,
      0 6px 8px rgb(0 0 0 / 0.5),
      inset 0 -6px 16px rgb(80 0 6 / 0.6),
      inset 0 4px 8px rgb(255 190 190 / 0.3);
  }
</style>
