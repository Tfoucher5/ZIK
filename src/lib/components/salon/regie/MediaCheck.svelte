<script>
  /**
   * État de la musique de la prochaine partie, vérifiée dès le lobby :
   * vidéos trouvées, titres joués en extrait audio, titres introuvables.
   *
   * @type {{ check: { total: number, video: number, audio: number, missing: number } | null }}
   */
  let { check } = $props();

  let done = $derived(check ? check.video + check.audio + check.missing : 0);
  let fini = $derived(check && done >= check.total);
  let alerte = $derived(fini && check.video < check.total / 2);
</script>

{#if check?.total}
  <div class="mc" class:ok={fini && !check.audio && !check.missing} class:alerte role="status">
    {#if !fini}
      <span class="sx-dots"><i></i><i></i><i></i></span> Vérification de la musique : {done} / {check.total}
    {:else if !check.audio && !check.missing}
      ✓ Musique prête : {check.total} titres sur {check.total}
    {:else}
      <span>
        ✓ {check.video} vidéo{check.video > 1 ? 's' : ''} prête{check.video > 1 ? 's' : ''}
        {#if check.audio} · {check.audio} en extrait audio (vidéo indisponible){/if}
        {#if check.missing} · {check.missing} remplacé{check.missing > 1 ? 's' : ''} automatiquement{/if}
      </span>
      {#if alerte}<small>YouTube répond mal en ce moment : la partie marche quand même, avec plus d'extraits audio.</small>{/if}
    {/if}
  </div>
{/if}

<style>
  .mc {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    border-left: 3px solid var(--border2);
    background: var(--surface);
    color: var(--mid);
    font-size: 0.84rem;
    line-height: 1.4;
  }
  .mc.ok { border-color: var(--success); color: var(--text); }
  .mc.alerte { border-color: var(--danger); }
  .mc small { color: var(--mid); }
</style>
