<script>
  import { onMount, onDestroy } from 'svelte';
  import { version } from '$app/environment';
  import PlaylistModal from '#lib/components/salon/playlists/PlaylistModal.svelte';
  import ProUpsell from '#lib/components/salon/setup/ProUpsell.svelte';
  import RegieHeader from '#lib/components/salon/regie/RegieHeader.svelte';
  import RegieTabs from '#lib/components/salon/regie/RegieTabs.svelte';
  import RegieEtat from '#lib/components/salon/regie/RegieEtat.svelte';
  import RegieActions from '#lib/components/salon/regie/RegieActions.svelte';
  import RegieEnd from '#lib/components/salon/regie/RegieEnd.svelte';
  import RegieEndBar from '#lib/components/salon/regie/RegieEndBar.svelte';
  import TabDirect from '#lib/components/salon/regie/TabDirect.svelte';
  import RegiePrep from '#lib/components/salon/regie/RegiePrep.svelte';
  import RegiePro from '#lib/components/salon/regie/RegiePro.svelte';
  import TabPlayers from '#lib/components/salon/regie/TabPlayers.svelte';
  import NightBoard from '#lib/components/salon/regie/NightBoard.svelte';
  import RegieEvening from '#lib/components/salon/regie/RegieEvening.svelte';
  import TabSettings from '#lib/components/salon/regie/TabSettings.svelte';
  import SalonHelp from '#lib/components/salon/support/SalonHelp.svelte';
  import NoticeBanner from '#lib/components/ui/NoticeBanner.svelte';
  import ReclaimRequests from '#lib/components/salon/regie/ReclaimRequests.svelte';
  import { SalonRegie } from '#lib/components/salon/regie/salonRegie.svelte.js';
  import { FREE_MAX_PLAYERS } from '#lib/data/proPlans.js';
  import { createSupabaseClient } from '#lib/client/supabase.js';

  let { data } = $props();
  const r = new SalonRegie(createSupabaseClient(data.env.supabaseUrl, data.env.supabaseAnonKey));

  const prep = $derived(r.phase === 'lobby' && r.onglet === 'direct');
  const attente = $derived(r.pro ? 0 : r.offre.count);
  const playlistNames = $derived(r.allPlaylists.filter((pl) => r.settings.playlistIds?.includes(pl.id)).map((pl) => pl.name));

  onMount(() => r.mount());
  onDestroy(() => r.destroy());
</script>

<svelte:head>
  <title>Régie {r.code} - ZIK Soirée</title>
  <meta name="robots" content="noindex, nofollow">
  {#each ['regie', 'regie-reglages'] as f (f)}<link rel="stylesheet" href="/css/salon/{f}.css?v={version}">{/each}
</svelte:head>

<div class="rg">
  <RegieHeader
    code={r.code} screens={r.screens} joueurs={r.players.length}
    pro={r.pro} maxGratuit={FREE_MAX_PLAYERS} {prep} tvUrl={r.tvUrl} regieUrl={r.regieUrl}
    onCopy={r.copy}
    onUpsell={(f) => (r.upsell = f)}
    onHelp={() => (r.helpOpen = true)}
  />

  <NoticeBanner message={r.adminNotice} />

  {#if r.restarting}
    <p class="rg-outage" role="status">
      <b>Mise à jour de ZIK en cours.</b> La régie, la TV et les téléphones se reconnectent seuls. La manche coupée sera rejouée : la partie repart toute seule dès que la TV est reconnectée.
    </p>
  {:else if r.restored}
    <p class="rg-outage" role="status">
      <b>Mise à jour terminée.</b> {r.restored.resumeIn ? `La manche coupée reprend dans ${r.restored.resumeIn} secondes.` : 'Tout le monde est reconnecté.'}
    </p>
  {:else if r.connLost}
    <p class="rg-outage" role="status">
      <b>Connexion perdue.</b> La régie se reconnecte toute seule. La partie continue sur la TV, les joueurs gardent leurs points.
    </p>
  {:else if r.videoOutage}
    <p class="rg-outage" role="status">
      <b>La musique ne répond pas.</b> La partie attend et réessaie toute seule (prochain essai dans {r.videoOutage} s). Personne ne perd ses points. Si ça dure, appelle un admin.
    </p>
  {/if}

  {#if r.error}
    <div class="rg-vide">
      <p class="rg-error">{r.error}</p>
      <a class="sx-btn" href="/salon">Revenir à la préparation</a>
    </div>
  {:else if !r.ready}
    <div class="rg-vide"><p class="rg-muted">Connexion à la soirée…</p></div>
  {:else}
    <RegieTabs actif={r.onglet} joueurs={r.players.length} onChange={(id) => (r.onglet = id)} />
    {#if r.live && r.onglet !== 'direct'}
      <RegieEtat round={r.round} maxRounds={r.settings.maxRounds ?? 0} paused={r.paused} chrono={r.etat.chrono} p={r.etat.p} repondu={r.answered} joueurs={r.players.length}
        buzzer={r.phase === 'round' ? (r.buzzer?.username ?? null) : null} />
    {/if}
    <ReclaimRequests usernames={r.reclaims} onAnswer={(username, accept) => r.send('salon_reclaim_answer', { username, accept })} />

    <div class="rg-corps">
      <div class="rg-zone">
        {#if !prep}<RegiePro o={r.offre} pro={r.pro} replie />{/if}
        {#if r.onglet === 'direct'}
          <TabDirect
            phase={r.phase} etat={r.etat} track={r.track} answerMode={r.settings.answerMode}
            volume={r.volume} pro={r.pro} history={r.history}
            onVolume={r.setVolume}
            onReport={(reason, round) => r.send('salon_report_video', { reason, round })}
          >
            {#snippet haut()}
              {#if prep}
                <RegiePrep screens={r.screens} tvSound={r.tvSound} mediaCheck={r.mediaCheck} players={r.players} teams={r.teams} tvUrl={r.tvUrl} {attente}>
                  <RegiePro o={r.offre} pro={r.pro} players={r.players} />
                </RegiePrep>
              {:else if r.phase === 'gameover'}
                <RegieEnd
                  players={r.players} teams={r.teams} rounds={r.history.length} night={r.night}
                  intermission={r.intermission} finale={r.finale} qrBig={r.qrBig} pro={r.pro} tambour={r.settings.finaleSound !== false}
                  musique={playlistNames.join(', ') || 'Sélection en cours'} mediaCheck={r.mediaCheck}
                  onSend={r.send} onUpsell={(f) => (r.upsell = f)} onPlaylists={r.openPlaylists}
                  onClose={() => r.send('salon_close')}
                />
              {/if}
            {/snippet}
          </TabDirect>
        {:else if r.onglet === 'joueurs'}
          <TabPlayers
            players={r.players} teams={r.teams} phase={r.phase} code={r.code} pro={r.pro} step={r.step} confirmKick={r.confirmKick}
            onScore={(username, delta) => r.gate('score', () => r.send('salon_adjust_score', { username, delta }))}
            onSetScore={(username, score) => r.gate('score', () => r.send('salon_adjust_score', { username, score }))}
            onKick={r.kick}
            onTeam={(username, team) => r.send('salon_set_player_team', { username, team })}
          >
            <NightBoard night={r.night} pro={r.pro} onReset={() => r.send('salon_reset_night')} onUpsell={() => (r.upsell = 'night')} />
          </TabPlayers>
        {:else}
          <TabSettings
            settings={r.settings} phase={r.phase} round={r.round} pro={r.pro} mediaCheck={r.mediaCheck} {playlistNames}
            onSet={r.setSetting}
            onSound={(patch) => r.send('salon_update_settings', patch)}
            onRenameTeam={(team, name) => r.send('salon_rename_team', { team, name })}
            onUpsell={(f) => (r.upsell = f)}
            onOpenPlaylists={r.openPlaylists}
            onClose={() => r.send('salon_close')}
          >
            <!-- En fin de partie, la soirée se pilote depuis Direct -->
            {#if r.phase === 'lobby'}
              <RegieEvening pro={r.pro} night={r.night} intermission={r.intermission} finale={r.finale} lobby
                onSend={r.send} onUpsell={(f) => (r.upsell = f)} />
            {/if}
          </TabSettings>
        {/if}
      </div>
    </div>

    {#if r.phase === 'gameover'}
      <RegieEndBar intermission={r.intermission} finale={r.finale} countStart={r.settings.countStart !== false}
        onRestart={() => r.send('salon_restart')} onClose={() => r.send('salon_close')} />
    {:else}
      <RegieActions
        phase={r.phase} paused={r.paused} pro={r.pro} joueurs={r.players.length} countStart={r.settings.countStart !== false}
        buzzer={r.buzzer} note={r.etat.note} {attente}
        onAction={(ev) => r.send(ev)}
        onJudge={(correct) => r.send('salon_buzz_judge', { correct })}
        onGate={r.gate}
      />
    {/if}
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

  {#if r.upsell}<ProUpsell feature={r.upsell} code={r.code} onClose={() => (r.upsell = null)} />{/if}

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
    background: linear-gradient(180deg, #0e0e16, #07070b);
  }

  .rg-corps { flex: 1; min-height: 0; overflow-y: auto; }
  .rg-zone {
    max-width: 1180px;
    margin: 0 auto;
    padding: 16px 16px 18px;
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
    bottom: calc(100px + env(safe-area-inset-bottom, 0px));
    z-index: 70;
    padding: 12px 16px;
    background: var(--text);
    color: var(--bg);
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.86rem;
  }

  @media (min-width: 900px) {
    .rg-zone { padding: 24px 24px 28px; }
  }
</style>
