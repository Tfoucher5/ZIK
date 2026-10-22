<script>
  import { toast } from '$lib/client/toast.svelte.js';
  import EphDialog from './EphDialog.svelte';
  import LaunchCreated from './LaunchCreated.svelte';
  import LaunchSettings from './LaunchSettings.svelte';

  let { open, playlist, tracks, user, onClose } = $props();

  let rsOpen = $state(false);
  let rsRounds = $state(10);
  let rsDuration = $state(30);
  let rsBreak = $state(7);
  let rsError = $state('');
  let rsSaving = $state(false);
  let rcOpen = $state(false);
  let rcCode = $state('');

  $effect(() => {
    if (!open) return;
    rsRounds = Math.min(10, tracks.length);
    rsDuration = 30; rsBreak = 7; rsError = '';
    rcOpen = false;
    rsOpen = true;
  });

  $effect(() => { if (open && !rsOpen && !rcOpen) onClose(); });

  async function createRoom() {
    rsSaving = true; rsError = '';
    try {
      const r = await fetch('/api/rooms/custom', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playlist.name, emoji: playlist.emoji, tracks,
          maxRounds: rsRounds, roundDuration: rsDuration, breakDuration: rsBreak,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      rcCode = data.code; rcOpen = true; rsOpen = false;
    } catch (e) { rsError = e.message; }
    rsSaving = false;
  }

  function joinRoomNow() {
    const username = user?.profile?.username || user?.email?.split('@')[0] || 'Joueur';
    const uid = user?.id || '';
    const p = new URLSearchParams({ roomId: rcCode, username, userId: uid, isGuest: uid ? '0' : '1' });
    window.location.href = `/game?${p}`;
  }

  function copyLink() {
    const url = `${location.origin}/game?roomId=${rcCode}`;
    navigator.clipboard.writeText(url).then(() => toast('Lien copié !', 'success')).catch(() => toast('Copie échouée', 'error'));
  }
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') { rsOpen = false; rcOpen = false; } }} />

{#if rsOpen}
  <EphDialog icon="⚡" kicker="Room éphémère" title="Lancer une room" onclose={() => (rsOpen = false)}>
    <LaunchSettings
      {playlist}
      {tracks}
      bind:rounds={rsRounds}
      bind:duration={rsDuration}
      bind:pause={rsBreak}
      error={rsError}
      saving={rsSaving}
      oncancel={() => (rsOpen = false)}
      oncreate={createRoom}
    />
  </EphDialog>
{/if}

{#if rcOpen}
  <EphDialog icon="✓" kicker="Room créée" title="C'est prêt !" ok onclose={() => (rcOpen = false)}>
    <LaunchCreated code={rcCode} oncopy={copyLink} onjoin={joinRoomNow} />
  </EphDialog>
{/if}
