<script>
  import { onMount, onDestroy } from 'svelte';
  import { version } from '$app/environment';
  import HostCenter from '$lib/components/salon/host/HostCenter.svelte';
  import HostTopBar from '$lib/components/salon/host/HostTopBar.svelte';
  import PlayerSidebar from '$lib/components/salon/host/PlayerSidebar.svelte';
  import HostFinale from '$lib/components/salon/host/HostFinale.svelte';
  import PlaylistModal from '$lib/components/salon/playlists/PlaylistModal.svelte';
  import SalonHelp from '$lib/components/salon/support/SalonHelp.svelte';
  import NoticeBanner from '$lib/components/ui/NoticeBanner.svelte';
  import BigCountdown from '$lib/components/salon/BigCountdown.svelte';
  import HostLobby from '$lib/components/salon/host/HostLobby.svelte';
  import HostPrep from '$lib/components/salon/host/HostPrep.svelte';
  import LobbyCountdown from '$lib/components/salon/host/LobbyCountdown.svelte';
  import HostGameOver from '$lib/components/salon/host/HostGameOver.svelte';
  import HostQrBig from '$lib/components/salon/host/HostQrBig.svelte';
  import { lobbyShown, prepShown } from '$lib/components/salon/host/lobbyView.js';
  import { gameOverShown, qrBigShown } from '$lib/components/salon/host/gameOverView.js';
  import { SalonHost } from '$lib/components/salon/host/salonHost.svelte.js';
  import { createSupabaseClient } from '$lib/client/supabase.js';

  let { data } = $props();
  let calm = $state(false);
  const h = new SalonHost(createSupabaseClient(data.env.supabaseUrl, data.env.supabaseAnonKey));

  onMount(() => h.mount());
  onDestroy(() => h.destroy());
</script>

<svelte:head>
  <title>ZIK Soirée - Hôte {h.code}</title>
  <meta name="robots" content="noindex, nofollow">
  {#each ["tv-prep", "tv-lobby"] as f (f)}<link rel="stylesheet" href="/css/salon/{f}.css?v={version}">{/each}
</svelte:head>

{#if !h.joined && h.error}
  <main class="sh-locked">
    <p class="sx-kicker"><b>●</b> ZIK Salon</p>
    <h1>Écran réservé<br>à l'hôte.</h1>
    <p>{h.error} Pour rejoindre la partie, va sur <b>zik-music.fr</b> et entre le code affiché sur la TV.</p>
    <a class="sx-btn sx-btn-primary" href="/salon/play?code={h.code}">Rejoindre comme joueur</a>
  </main>
{:else}
<div class="sh" class:sh-calm={calm} inert={prepShown(h)}>
  <div>
    <HostTopBar {h} bind:calm />
    <NoticeBanner message={h.adminNotice} tv />
  </div>

  <div class="sh-progress {h.timerLevel}">
    {#if h.phase === 'round'}<i style="width:{h.timerMax ? (h.timerVal / h.timerMax) * 100 : 0}%"></i>{/if}
  </div>

  <div class="sh-body">
    <HostCenter
      bind:this={h.hostCenter}
      phase={h.phase} code={h.code} timerVal={h.timerVal} timerMax={h.timerMax} timerStarted={h.timerStarted}
      players={h.players} roundEnd={h.roundEnd}
      paused={h.paused}
      round={h.round} total={h.total}
      choices={h.choices}
      answerMode={h.settings.answerMode || 'free'}
      onMusicReady={() => h.socket?.emit('salon_music_ready')}
      onVideoError={(videoId) => h.socket?.emit('salon_video_failed', { videoId })}
      buzzer={h.buzzer} special={h.special} specialIntro={h.specialIntro} intermission={h.intermission} videoOutage={h.videoOutage} restarting={h.restarting} restored={h.restored} connLost={h.connLost}
      onJudge={(correct) => h.socket?.emit('salon_buzz_judge', { correct })}
    />
    <PlayerSidebar players={h.players} teams={h.teams} night={h.night} phase={h.phase} deltas={h.deltas} answerMode={h.settings.answerMode || 'free'} />
    {#if lobbyShown(h)}<HostLobby {h} />{/if}
    {#if gameOverShown(h)}<HostGameOver {h} />{/if}
    {#if qrBigShown(h)}<HostQrBig code={h.code} onClose={h.controls ? null : () => h.setQrBig(false)} />{/if}
  </div>

  <LobbyCountdown sec={h.startSec} rejouer={h.phase === 'gameover' || h.phase === 'summary'} />
  <BigCountdown sec={h.nextShown && h.nextSec <= 3 && !h.paused ? h.nextSec : 0} />

  {#if h.phase === 'lobby' && !h.controls}
    <footer class="sh-foot">
      <button class="sx-btn sx-btn-primary sx-btn-lg" onclick={h.startGame} disabled={h.players.length === 0}>
        {h.players.length === 0 ? 'En attente de joueurs' : 'Lancer la partie'}
      </button>
    </footer>
  {/if}
</div>

{/if}

{#if prepShown(h)}<HostPrep {h} />{/if}

{#if h.finale}<HostFinale finale={h.finale} volume={h.volume} sound={h.settings.finaleSound !== false} />{/if}

{#if h.joined && (h.playlistNotice || h.error)}
  <p class="sh-toast" class:err={!!h.error} role="status">{h.error || h.playlistNotice}</p>
{/if}

<SalonHelp
  bind:open={h.helpOpen}
  code={h.code}
  role="host"
  pro={h.pro}
  chat={h.chat}
  reporterId={h.userId}
  getState={() => ({
    connected: h.socket?.connected ?? false,
    error: h.error || null,
    phase: h.phase, paused: h.paused, round: h.round, maxRounds: h.total,
    players: h.players.length,
    offline: h.players.filter((p) => p.offline).length,
    timer: h.phase === 'round' ? h.timerVal : null,
    timerStarted: h.timerStarted,
    volume: h.volume,
    settings: { answerMode: h.settings.answerMode, roundDuration: h.settings.roundDuration, manualNext: h.settings.manualNext },
  })}
/>

{#if h.pickerOpen}
  <PlaylistModal
    playlists={h.allPlaylists}
    bind:selectedIds={h.pickerIds}
    live={h.phase === 'round' || h.phase === 'summary'}
    remaining={Math.max(0, h.total - h.round)}
    saving={h.savingPlaylist}
    error={h.pickerError}
    onSave={h.savePlaylists}
    onClose={() => (h.pickerOpen = false)}
  />
{/if}
