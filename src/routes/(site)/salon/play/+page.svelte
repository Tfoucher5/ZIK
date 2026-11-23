<script>
  import { teamColor } from '$lib/data/salonOptions.js';
  import { onMount, onDestroy } from 'svelte';
  import JoinForm from '$lib/components/salon/play/JoinForm.svelte';
  import RoundPlay from '$lib/components/salon/play/RoundPlay.svelte';
  import SummaryView from '$lib/components/salon/play/SummaryView.svelte';
  import FeedbackOverlay from '$lib/components/salon/play/FeedbackOverlay.svelte';
  import PlayLobby from '$lib/components/salon/play/PlayLobby.svelte';
  import PlayBoard from '$lib/components/salon/play/PlayBoard.svelte';
  import PlayEvening from '$lib/components/salon/play/PlayEvening.svelte';
  import PlayGameOver from '$lib/components/salon/play/PlayGameOver.svelte';
  import PlayQueue from '$lib/components/salon/play/PlayQueue.svelte';
  import NoticeBanner from '$lib/components/ui/NoticeBanner.svelte';
  import BigCountdown from '$lib/components/salon/BigCountdown.svelte';
  import { SalonPlayer } from '$lib/components/salon/play/salonPlayer.svelte.js';
  import { takeAutoResume } from '$lib/components/salon/play/resume.js';
  import { createSupabaseClient } from '$lib/client/supabase.js';

  let { data } = $props();
  const p = new SalonPlayer(createSupabaseClient(data.env.supabaseUrl, data.env.supabaseAnonKey));

  function hue(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
  }

  let codeKnown = $state(false);
  const lobby = $derived(p.phase === 'lobby' || p.phase === 'starting');
  // Décompte reçu après une partie : on rejoue avec les mêmes joueurs
  const replay = $derived(p.phase === 'gameover' || p.phase === 'summary');

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code')?.toUpperCase() || '';
    p.checkResume(code);
    if (p.resume && takeAutoResume(p.resume.code)) p.connectAndJoin();
    codeKnown = /^[A-Z0-9]{6}$/.test(code);
    if (code) document.getElementById('sp-username')?.focus();
  });

  onDestroy(() => p.destroy());
</script>

<svelte:head>
  <title>Rejoindre un blind test en soirée - ZIK Salon</title>
  <meta name="robots" content="noindex, follow">
  <meta name="description" content="Entre le code affiché sur la TV et ton pseudo pour jouer au blind test depuis ton téléphone. Sans appli, sans compte.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</svelte:head>

{#if p.waiting}
  <main class="sp"><div class="sp-body"><PlayQueue {p} /></div></main>
{:else if !p.joined}
  <a class="salon-back salon-play-backlink" href="/">← Accueil ZIK</a>
  <JoinForm
    bind:codeInput={p.codeInput}
    bind:usernameInput={p.usernameInput}
    joinError={p.joinError}
    joining={p.joining}
    resume={p.resume}
    nameTaken={p.nameTaken}
    reclaimPending={p.reclaimPending}
    onForget={p.forgetResume}
    onJoin={p.connectAndJoin}
    onReclaim={p.requestReclaim}
    onChangeName={p.changeName}
    {codeKnown}
  />
{:else}
  <main class="sp" class:sp-fill={p.choosingTeam && lobby}>
    {#if p.connLost && !p.restarting}
      <p class="sp-conn" role="status">Connexion perdue : on te reconnecte. Ta place et tes points sont gardés.</p>
    {/if}
    {#if !lobby && p.phase !== 'gameover'}
    <header class="sp-head">
      <span class="sp-av" style="--h:{hue(p.username)}">{p.username[0]?.toUpperCase() ?? '?'}</span>
      <div>
        <div class="sp-name">{p.username}</div>
        <div class="sp-salon">
          {p.code}
          {#if p.teamName}<span class="sp-team-tag" style="--tc:{teamColor(p.myTeam)}">{p.teamName}</span>{/if}
        </div>
      </div>
      <div class="sp-score">{p.myScore}<small>points</small></div>
    </header>
    {/if}

    <NoticeBanner message={p.adminNotice} />

    <div class="sp-body">
      {#if p.admitted && lobby && !p.team}
        <p class="sp-strip ok" role="status"><i aria-hidden="true">✓</i><span>Une place s'est libérée. Tu es dedans, {p.username}.</span></p>
      {/if}
      <!-- Avant le contenu : la barre collante de fin de partie ne les cache pas -->
      {#if p.restarting}<p class="sp-error">Mise à jour en cours : reconnexion automatique dans quelques secondes. La manche en cours sera rejouée.</p>{/if}
      {#if p.restored}<p class="sp-error">Mise à jour terminée{p.restored.resumeIn ? ` : la manche reprend dans ${p.restored.resumeIn} secondes` : ''}.</p>{/if}
      {#if p.videoOutage}<p class="sp-error">Petite pause technique : les vidéos ne répondent pas, la partie reprend toute seule.</p>{/if}
      {#if p.error}<p class="sp-error">{p.error}</p>{/if}
      {#if lobby}
        <PlayLobby {p} />
      {:else if p.phase === 'round'}
        <RoundPlay
          round={p.round} total={p.total}
          timerVal={p.timerVal} timerMax={p.timerMax} timerStarted={p.timerStarted}
          answerMode={p.answerMode} choices={p.choices}
          foundArtist={p.foundArtist} foundTitle={p.foundTitle} foundFeats={p.foundFeats}
          extras={p.extras} foundExtras={p.foundExtras}
          allFound={p.allFound}
          chosenIndex={p.chosenIndex}
          revealCorrectIndex={p.revealCorrectIndex}
          bind:guess={p.guess}
          onSubmitGuess={p.submitGuess}
          onSubmitChoice={p.submitChoice}
          special={p.special} specialIntro={p.specialIntro} buzzer={p.buzzer} buzzLocked={p.buzzLocked} username={p.username}
          onBuzz={p.buzz}
        />

        {#if p.board.length > 1 && p.allFound && (p.answerMode !== 'multiple' || (p.chosenIndex !== null && p.revealCorrectIndex === null))}
          <PlayBoard {p} />
        {/if}
      {:else if p.phase === 'summary'}
        <SummaryView
          roundEnd={p.roundEnd} ranking={p.ranking}
          username={p.username} teams={p.teams} myTeam={p.myTeam}
          round={p.round} total={p.total}
        />
        {#if p.nextShown && p.nextSec > 0}<p class="sp-next">Titre suivant dans {p.nextSec} s</p>{/if}
      {:else if p.phase === 'gameover'}
        {#if p.replaying}
          <div class="sp-center">
            <p class="sx-kicker">Nouvelle partie</p>
            <div class="sp-big">On remet ça.</div>
            <p>La musique arrive sur la TV…</p>
          </div>
        {:else}
          <PlayGameOver {p} />
        {/if}
      {/if}
    </div>
  </main>

  {#if p.intermission || p.finale}
    <PlayEvening intermission={p.intermission} finale={p.finale} myTeam={p.myTeam} username={p.username} code={p.code} />
  {/if}

  {#if p.paused && !p.buzzer}
    <div class="sp-pause"><span>Pause</span><small>L'hôte a mis la partie en pause</small></div>
  {/if}

  <FeedbackOverlay feedback={p.feedback} />
  <BigCountdown
    sec={p.startSec}
    label={replay && p.startSec > 3 ? 'On remet ça.' : 'La partie commence'}
    hint={!replay ? 'Le son sort de la TV.' : p.startSec > 3 ? 'Tes points repartent de zéro. Tu gardes ta place.' : ''}
  />
{/if}
