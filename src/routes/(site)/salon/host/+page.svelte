<script>
  import { onMount, onDestroy } from 'svelte';
  import HostCenter from '$lib/components/salon/host/HostCenter.svelte';
  import HostTopBar from '$lib/components/salon/host/HostTopBar.svelte';
  import PlayerSidebar from '$lib/components/salon/host/PlayerSidebar.svelte';
  import PlaylistModal from '$lib/components/salon/playlists/PlaylistModal.svelte';
  import SalonHelp from '$lib/components/salon/support/SalonHelp.svelte';
  import { SalonHost } from '$lib/components/salon/host/salonHost.svelte.js';
  import { createSupabaseClient } from '$lib/client/supabase.js';

  let { data } = $props();
  const h = new SalonHost(createSupabaseClient(data.env.supabaseUrl, data.env.supabaseAnonKey));

  onMount(() => h.mount());
  onDestroy(() => h.destroy());
</script>

<svelte:head>
  <title>ZIK Salon - Hôte {h.code}</title>
  <meta name="robots" content="noindex, nofollow">
</svelte:head>

{#if !h.joined && h.error}
  <main class="sh-locked">
    <p class="sx-kicker"><b>●</b> ZIK Salon</p>
    <h1>Écran réservé<br>à l'hôte.</h1>
    <p>{h.error} Pour rejoindre la partie, va sur <b>zik-music.fr/salon/play</b> et entre le code affiché sur la TV.</p>
    <a class="sx-btn sx-btn-primary" href="/salon/play?code={h.code}">Rejoindre comme joueur</a>
  </main>
{:else}
<div class="sh">
  <HostTopBar {h} />

  <div class="sh-progress {h.timerLevel}">
    {#if h.phase === 'round'}<i style="width:{h.timerMax ? (h.timerVal / h.timerMax) * 100 : 0}%"></i>{/if}
  </div>

  <div class="sh-body">
    <HostCenter
      bind:this={h.hostCenter}
      phase={h.phase} code={h.code} timerVal={h.timerVal} timerMax={h.timerMax} timerStarted={h.timerStarted}
      players={h.players} teams={h.teams} roundEnd={h.roundEnd} gameOver={h.gameOver}
      paused={h.paused} pro={h.pro}
      round={h.round} total={h.total}
      choices={h.choices}
      answerMode={h.settings.answerMode || 'free'}
      onRestart={h.restartGame}
      settings={h.settings}
      onSetting={(patch) => h.socket?.emit('salon_update_settings', patch)}
      onChangePlaylists={h.canChangePlaylists ? h.openPicker : null}
      onNewSalon={() => window.location.href = '/salon'}
      onMusicReady={() => h.socket?.emit('salon_music_ready')}
      onVideoError={(videoId) => h.socket?.emit('salon_video_failed', { videoId })}
    />
    <PlayerSidebar players={h.players} teams={h.teams} phase={h.phase} deltas={h.deltas} answerMode={h.settings.answerMode || 'free'} />
  </div>

  {#if h.phase === 'lobby'}
    <footer class="sh-foot">
      <button class="sx-btn sx-btn-primary sx-btn-lg" onclick={h.startGame} disabled={h.players.length === 0}>
        {h.players.length === 0 ? 'En attente de joueurs' : 'Lancer la partie'}
      </button>
    </footer>
  {/if}
</div>

{/if}

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
