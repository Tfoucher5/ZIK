<script>
  /**
   * État de la musique de la prochaine partie, vérifiée dès le lobby :
   * vidéos trouvées, titres joués en extrait audio, titres introuvables.
   *
   * Sur la TV (`tv`), le bilan ne sert qu'à l'hôte : seulement la vérification en
   * cours et l'alerte, sauf sans régie (`solo`) où personne d'autre ne le verrait.
   *
   * @type {{ check: { total: number, video: number, audio: number, missing: number } | null, tv?: boolean, solo?: boolean }}
   */
  let { check, tv = false, solo = true } = $props();

  let done = $derived(check ? check.video + check.audio + check.missing : 0);
  let fini = $derived(check && done >= check.total);
  let alerte = $derived(fini && check.video < check.total / 2);
</script>

{#if check?.total && (!tv || solo || !fini || alerte)}
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
      {#if alerte}<small>{tv
        ? 'Peu de clips disponibles : la partie se jouera surtout en extraits audio.'
        : 'Moins de la moitié des titres ont leur clip : la partie se jouera surtout en extraits audio. Tu peux changer de playlist dans Réglages.'}</small>{/if}
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
