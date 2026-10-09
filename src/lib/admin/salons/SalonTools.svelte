<script>
  import { enhance } from '$app/forms';
  import VideoFixer from '$lib/admin/VideoFixer.svelte';
  import ConfirmSubmit from './ConfirmSubmit.svelte';

  /** Pause, passage de titre, Pro offert et vidéo du titre en cours. */
  let { s, token, busy, submit, fixer = $bindable(false) } = $props();

  const playing = $derived(s.phase === 'round' || s.phase === 'summary');
</script>

{#if s.track}
  <section class="a-card block">
    <h3>Titre en cours</h3>
    <p class="now"><b>{s.track.artist}</b> · {s.track.title}</p>
    {#if s.track.id}
      <button class="a-btn small" type="button" onclick={() => (fixer = !fixer)}>{fixer ? 'Masquer la vidéo' : 'Voir et corriger la vidéo'}</button>
      {#if fixer}
        {#key s.code + s.track.id}
          <VideoFixer track={s.track} reported={s.video ? { videoId: s.video.id, start: s.video.start } : null} {token} />
        {/key}
      {/if}
    {/if}
  </section>
{/if}

<section class="a-card block">
  <h3>Dépanner</h3>
  <div class="a-btns">
    {#if s.paused}
      <form method="POST" action="?/resume" use:enhance={submit}>
        <input type="hidden" name="code" value={s.code} />
        <button class="a-btn good" disabled={busy}>Reprendre</button>
      </form>
    {:else if playing}
      <form method="POST" action="?/pause" use:enhance={submit}>
        <input type="hidden" name="code" value={s.code} />
        <button class="a-btn" disabled={busy}>Mettre en pause</button>
      </form>
    {/if}
    {#if playing}
      <form method="POST" action="?/skip" use:enhance={submit} class="inline">
        <input type="hidden" name="code" value={s.code} />
        <ConfirmSubmit label={s.phase === 'round' ? 'Passer le titre' : 'Manche suivante'} {busy} />
      </form>
    {/if}
    {#if !s.pro}
      <form method="POST" action="?/giftPro" use:enhance={submit} class="inline">
        <input type="hidden" name="code" value={s.code} />
        <ConfirmSubmit label="Offrir le Pro ce soir" {busy} />
      </form>
    {/if}
  </div>
  <p class="a-muted hint">
    {#if s.phase === 'round'}« Passer le titre » révèle la réponse, puis la partie continue.{:else if s.phase === 'summary'}« Manche suivante » lance le titre d'après.{:else}Pause et passage de titre servent pendant une partie.{/if}
    {#if !s.pro} Le Pro offert débloque tout le salon jusqu'à sa fermeture, sans paiement.{/if}
  </p>
</section>

<style>
  .block { display: grid; gap: 10px; min-width: 0; }
  h3 { font-size: 0.8rem; font-weight: 700; color: var(--a-dim); text-transform: uppercase; letter-spacing: 0.04em; }
  .block > .a-btn.small { justify-self: start; }
  .now { overflow-wrap: anywhere; }
  .inline { display: contents; }
  .hint { font-size: 0.82rem; }
</style>
