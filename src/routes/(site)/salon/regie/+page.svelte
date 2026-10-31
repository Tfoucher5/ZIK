<script>
  import { onMount, onDestroy } from 'svelte';
  import PlaylistModal from '$lib/components/salon/playlists/PlaylistModal.svelte';
  import ProUpsell from '$lib/components/salon/setup/ProUpsell.svelte';
  import RegieHeader from '$lib/components/salon/regie/RegieHeader.svelte';
  import RegieTabs from '$lib/components/salon/regie/RegieTabs.svelte';
  import RegieActions from '$lib/components/salon/regie/RegieActions.svelte';
  import TabDirect from '$lib/components/salon/regie/TabDirect.svelte';
  import TabPlayers from '$lib/components/salon/regie/TabPlayers.svelte';
  import NightBoard from '$lib/components/salon/regie/NightBoard.svelte';
  import RegieEvening from '$lib/components/salon/regie/RegieEvening.svelte';
  import MediaCheck from '$lib/components/salon/regie/MediaCheck.svelte';
  import TabSettings from '$lib/components/salon/regie/TabSettings.svelte';
  import SalonHelp from '$lib/components/salon/support/SalonHelp.svelte';
  import { SalonRegie, PHASES } from '$lib/components/salon/regie/salonRegie.svelte.js';
  import { FREE_MAX_PLAYERS } from '$lib/data/proPlans.js';
  import { createSupabaseClient } from '$lib/client/supabase.js';

  let { data } = $props();
  const r = new SalonRegie(createSupabaseClient(data.env.supabaseUrl, data.env.supabaseAnonKey));

  onMount(() => r.mount());
  onDestroy(() => r.destroy());
</script>

<svelte:head>
  <title>Régie {r.code} - ZIK Salon</title>
  <meta name="robots" content="noindex, nofollow">
</svelte:head>

<div class="rg">
  <RegieHeader
    code={r.code} phase={r.phase} phaseLabel={PHASES[r.phase]} paused={r.paused} round={r.round} maxRounds={r.settings.maxRounds ?? 0}
    timerVal={r.timerVal} timerMax={r.timerMax} timerOn={r.timerOn} screens={r.screens}
    joueurs={r.players.length} repondu={r.answered}
    pro={r.pro} maxGratuit={FREE_MAX_PLAYERS} tvUrl={r.tvUrl} regieUrl={r.regieUrl}
    onCopy={r.copy}
    onUpsell={(f) => (r.upsell = f)}
    onHelp={() => (r.helpOpen = true)}
  />

  {#if r.videoOutage}
    <p class="rg-outage" role="status">
      <b>Les vidéos YouTube ne répondent pas.</b> La partie attend et réessaie toute seule (prochain essai dans {r.videoOutage} s). Personne ne perd ses points. Si ça dure, appelle un admin.
    </p>
  {/if}

  {#if r.error}
    <div class="rg-vide">
      <p class="rg-error">{r.error}</p>
      <a class="sx-btn" href="/salon">Revenir à la préparation</a>
    </div>
  {:else if !r.ready}
    <div class="rg-vide"><p class="rg-muted">Connexion au salon…</p></div>
  {:else}
    <RegieTabs actif={r.onglet} joueurs={r.players.length} onChange={(id) => (r.onglet = id)} />

    <div class="rg-corps">
      <div class="rg-zone">
        {#if r.idle && r.mediaCheck}<div class="rg-media"><MediaCheck check={r.mediaCheck} /></div>{/if}
        {#if r.onglet === 'direct'}
          <TabDirect
            phase={r.phase} code={r.code} track={r.track} answerMode={r.settings.answerMode}
            volume={r.volume} pro={r.pro} history={r.history}
            onVolume={r.setVolume}
            onReport={(reason) => r.send('salon_report_video', { reason })}
          />
        {:else if r.onglet === 'joueurs'}
          <NightBoard night={r.night} pro={r.pro} onReset={() => r.send('salon_reset_night')} onUpsell={() => (r.upsell = 'night')} />
          <TabPlayers
            players={r.players} teams={r.teams} phase={r.phase} code={r.code} pro={r.pro} step={r.step} confirmKick={r.confirmKick}
            onScore={(username, delta) => r.gate('score', () => r.send('salon_adjust_score', { username, delta }))}
            onSetScore={(username, score) => r.gate('score', () => r.send('salon_adjust_score', { username, score }))}
            onKick={r.kick}
            onTeam={(username, team) => r.send('salon_set_player_team', { username, team })}
          />
        {:else}
          {#if r.idle}
            <RegieEvening pro={r.pro} night={r.night} intermission={r.intermission} finale={r.finale} finaleSound={r.settings.finaleSound !== false}
              onSend={r.send} onUpsell={(f) => (r.upsell = f)} />
          {/if}
          <TabSettings
            settings={r.settings} phase={r.phase} round={r.round} pro={r.pro}
            playlistNames={r.allPlaylists.filter((pl) => r.settings.playlistIds?.includes(pl.id)).map((pl) => pl.name)}
            onSet={r.setSetting}
            onRenameTeam={(team, name) => r.send('salon_rename_team', { team, name })}
            onUpsell={(f) => (r.upsell = f)}
            onOpenPlaylists={r.openPlaylists}
            onSound={(patch) => r.send('salon_update_settings', patch)}
          />
        {/if}
      </div>
    </div>

    <RegieActions
      phase={r.phase} paused={r.paused} pro={r.pro} joueurs={r.players.length} buzzer={r.buzzer}
      onAction={(ev) => r.send(ev)}
      onJudge={(correct) => r.send('salon_buzz_judge', { correct })}
      onGate={r.gate}
    />
  {/if}

  {#if r.notice}<p class="rg-notice" role="status">{r.notice}</p>{/if}

  <SalonHelp
    bind:open={r.helpOpen}
    code={r.code}
    role="regie"
    pro={r.pro}
    chat={r.chat}
    reporterId={r.userId}
    getState={() => ({
      connected: r.socket?.connected ?? false,
      error: r.error || null,
      phase: r.phase, paused: r.paused, round: r.round, maxRounds: r.settings.maxRounds,
      players: r.players.length,
      offline: r.players.filter((p) => p.offline).length,
      screens: r.screens,
      track: r.track ? `${r.track.artist} · ${r.track.title}` : null,
      settings: { answerMode: r.settings.answerMode, roundDuration: r.settings.roundDuration, manualNext: r.settings.manualNext },
    })}
  />

  {#if r.upsell}<ProUpsell feature={r.upsell} onClose={() => (r.upsell = null)} />{/if}

  {#if r.pickerOpen}
    <PlaylistModal
      playlists={r.allPlaylists}
      bind:selectedIds={r.pickerIds}
      live={r.live}
      remaining={Math.max(0, (r.settings.maxRounds ?? 0) - r.round)}
      saving={r.saving}
      onSave={r.savePlaylists}
      onClose={() => (r.pickerOpen = false)}
    />
  {/if}
</div>

<style>
  /* Console fixe : l'en-tête et la barre d'actions ne bougent jamais, seule
     la zone d'onglet défile. Même ossature du téléphone au second écran. */
  .rg {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .rg-corps { flex: 1; min-height: 0; overflow-y: auto; }
  /* Sur un grand écran, la zone reste centrée plutôt qu'étirée : la console
     se lit comme compacte et non comme une page à moitié vide. */
  .rg-zone {
    max-width: 900px;
    margin: 0 auto;
    padding: 22px 18px 32px;
  }

  .rg-vide {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 40px 20px;
    text-align: center;
  }
  .rg-muted { color: var(--mid); font-size: 0.88rem; line-height: 1.5; }
  .rg-error { max-width: 460px; color: var(--danger); font-size: 0.95rem; line-height: 1.6; margin: 0; }

  .rg-media { margin-bottom: 18px; }
  .rg-outage {
    margin: 0;
    padding: 12px 18px;
    background: rgb(248 113 113 / 0.14);
    border-bottom: 1px solid var(--danger);
    font-size: 0.86rem;
    line-height: 1.5;
    color: var(--text);
  }
  .rg-outage b { color: var(--danger); }

  .rg-notice {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(86px + env(safe-area-inset-bottom, 0px));
    z-index: 70;
    padding: 12px 16px;
    background: var(--text);
    color: var(--bg);
    border-radius: 3px;
    font-weight: 600;
    font-size: 0.86rem;
  }

  @media (max-width: 640px) {
    .rg-zone { padding: 18px 12px 28px; }
  }
</style>
