<script>
  import VideoFixer from '$lib/admin/VideoFixer.svelte';
  import TrackAudioDebugger from '$lib/components/admin/TrackAudioDebugger.svelte';

  let { track, token } = $props();
  let tab = $state('video');
</script>

<div class="tr">
  <div class="a-chips" role="group" aria-label="Que réparer ?">
    <button class="a-chip" type="button" aria-pressed={tab === 'video'} onclick={() => (tab = 'video')}>Vidéo des salons</button>
    <button class="a-chip" type="button" aria-pressed={tab === 'audio'} onclick={() => (tab = 'audio')}>Extrait des rooms</button>
  </div>
  <p class="hint">
    {tab === 'video'
      ? 'La vidéo YouTube affichée sur la TV pendant une partie de salon.'
      : "L'extrait audio joué aux joueurs dans les rooms en ligne."}
  </p>
  {#key track.id}
    {#if tab === 'video'}
      <VideoFixer {track} {token} />
    {:else}
      <TrackAudioDebugger trackId={track.id} {token} />
    {/if}
  {/key}
</div>

<style>
  .tr { display: grid; gap: 12px; min-width: 0; }
  .hint { font-size: 0.82rem; color: var(--a-dim); }
</style>
