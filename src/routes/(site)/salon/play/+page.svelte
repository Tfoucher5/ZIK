<script>
  import { onMount, onDestroy } from 'svelte';
  import JoinForm from '$lib/components/salon/play/JoinForm.svelte';
  import RoundPlay from '$lib/components/salon/play/RoundPlay.svelte';
  import SummaryView from '$lib/components/salon/play/SummaryView.svelte';
  import FeedbackOverlay from '$lib/components/salon/play/FeedbackOverlay.svelte';
  import PlayLobby from '$lib/components/salon/play/PlayLobby.svelte';
  import PlayBoard from '$lib/components/salon/play/PlayBoard.svelte';
  import { SalonPlayer } from '$lib/components/salon/play/salonPlayer.svelte.js';
  import { createSupabaseClient } from '$lib/client/supabase.js';

  let { data } = $props();
  const p = new SalonPlayer(createSupabaseClient(data.env.supabaseUrl, data.env.supabaseAnonKey));

  function hue(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code')?.toUpperCase() || '';
    if (urlCode) p.codeInput = urlCode;
    const savedUser = localStorage.getItem('salon_user');
    if (savedUser && !p.usernameInput) p.usernameInput = savedUser;
  });

  onDestroy(() => p.destroy());
</script>

<svelte:head>
  <title>Rejoindre un blind test en soirée - ZIK Salon</title>
  <meta name="robots" content="noindex, follow">
  <meta name="description" content="Entre le code affiché sur la TV et ton pseudo pour jouer au blind test depuis ton téléphone. Sans appli, sans compte.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</svelte:head>

{#if !p.joined}
  <a class="salon-back salon-play-backlink" href="/">← Accueil ZIK</a>
  <JoinForm
    bind:codeInput={p.codeInput}
    bind:usernameInput={p.usernameInput}
    joinError={p.joinError}
    joining={p.joining}
    onJoin={p.connectAndJoin}
  />
{:else}
  <main class="sp">
    <header class="sp-head">
      <span class="sp-av" style="--h:{hue(p.username)}">{p.username[0]?.toUpperCase() ?? '?'}</span>
      <div>
        <div class="sp-name">{p.username}</div>
        <div class="sp-salon">
          Salon {p.code}
          {#if p.teamName}<span class="sp-team-tag" style="--tc:var(--q{p.myTeam})">{p.teamName}</span>{/if}
        </div>
      </div>
      <div class="sp-score">{p.myScore}<small>points</small></div>
    </header>

    <div class="sp-body">
      {#if p.phase === 'lobby' || p.phase === 'starting'}
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
        />

        {#if p.board.length > 1 && (p.answerMode === 'multiple' ? p.chosenIndex !== null && p.revealCorrectIndex === null : p.allFound)}
          <PlayBoard {p} />
        {/if}
      {:else if p.phase === 'summary' || p.phase === 'gameover'}
        <SummaryView
          phase={p.phase} roundEnd={p.roundEnd} finalScores={p.finalScores} scores={p.scores}
          username={p.username} teams={p.teams} myTeam={p.myTeam}
          round={p.round} total={p.total}
          onLeave={p.leave}
        />
      {/if}

      {#if p.error}<p class="sp-error">{p.error}</p>{/if}
    </div>
  </main>

  {#if p.paused}
    <div class="sp-pause"><span>Pause</span><small>L'hôte a mis la partie en pause</small></div>
  {/if}

  <FeedbackOverlay feedback={p.feedback} />
{/if}
