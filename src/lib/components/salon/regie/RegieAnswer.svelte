<script>
  /**
   * Titre en cours dans la régie, masqué pendant la manche : la régie peut être
   * une tablette posée sur le comptoir. Un clic déchiffre les lettres et la pochette.
   *
   * @type {{ track: any, phase: string, answerMode: string }}
   */
  let { track, phase, answerMode } = $props();

  const GLYPHES = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@';
  const brouille = (s) => s.replace(/\S/g, () => GLYPHES[Math.floor(Math.random() * GLYPHES.length)]);

  let visible = $state(false);
  let texte = $state('');
  let timer = null;

  let reponse = $derived(`${track.artist} - ${track.title}`);
  // À la réponse, le titre est déjà affiché sur la TV : plus rien à cacher
  let montre = $derived(visible || phase !== 'round');

  $effect(() => {
    void track.title;
    clearInterval(timer);
    visible = false;
    texte = brouille(reponse);
    return () => clearInterval(timer);
  });

  function dechiffrer() {
    visible = true;
    let n = 0;
    clearInterval(timer);
    timer = setInterval(() => {
      n += Math.max(1, Math.ceil(reponse.length / 18));
      texte = reponse.slice(0, n) + brouille(reponse.slice(n));
      if (n >= reponse.length) clearInterval(timer);
    }, 45);
  }
</script>

<div class="ra-track">
  {#if track.cover}
    <img src={track.cover} alt="" width="72" height="72" loading="lazy" decoding="async" class:flou={!montre}>
  {/if}
  <div class="ra-id">
    <b class:brouille={!montre} aria-label={montre ? reponse : 'Réponse masquée'}>{montre && !visible ? reponse : texte}</b>
    {#if montre && answerMode === 'multiple' && track.correctChoiceIndex != null}
      <small>Bonne réponse : choix {track.correctChoiceIndex + 1}</small>
    {/if}
    {#if !montre}
      <button type="button" class="ra-voir" onclick={dechiffrer}>Afficher la réponse</button>
    {:else if phase === 'round'}
      <small class="ra-secret">Visible sur cet écran uniquement</small>
    {/if}
  </div>
</div>

<style>
  .ra-track { display: flex; align-items: center; gap: 14px; margin-top: 12px; }
  .ra-track img {
    width: 72px; height: 72px; border-radius: 3px; object-fit: cover; flex-shrink: 0;
    background: var(--surface);
    transition: filter 0.8s ease, transform 0.8s ease;
  }
  .ra-track img.flou { filter: blur(14px) saturate(0.4); transform: scale(0.92); }
  .ra-id { min-width: 0; }
  .ra-id b { display: block; font-size: 1.05rem; line-height: 1.3; overflow-wrap: anywhere; }
  .ra-id b.brouille { font-family: var(--s-mono); color: var(--dim); letter-spacing: 0.05em; }
  .ra-id small { display: block; font-size: 0.76rem; color: var(--dim); margin-top: 4px; }
  .ra-secret { font-style: italic; }
  .ra-voir {
    margin-top: 8px; padding: 7px 12px; border-radius: 3px;
    border: 1px solid var(--border2); background: none; color: var(--text);
    font: inherit; font-size: 0.8rem; cursor: pointer;
  }
  .ra-voir:hover { border-color: var(--accent); color: var(--accent); }
</style>
