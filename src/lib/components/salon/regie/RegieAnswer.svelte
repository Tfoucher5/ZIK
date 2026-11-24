<script>
  /**
   * Titre en cours dans la régie, masqué pendant la manche : la régie peut être
   * une tablette posée sur le comptoir. Un clic déchiffre les lettres et la pochette.
   *
   * @type {{ track: any, phase: string, answerMode: string }}
   */
  import { texteReponse } from '#lib/components/salon/regie/reponse.js';

  let { track, phase, answerMode } = $props();

  const GLYPHES = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@';
  const brouille = (s) => s.replace(/\S/g, () => GLYPHES[Math.floor(Math.random() * GLYPHES.length)]);

  let visible = $state(false);
  let texte = $state('');
  let timer = null;

  let reponse = $derived(texteReponse(track));
  // À la réponse, le titre est déjà affiché sur la TV : plus rien à cacher
  let montre = $derived(visible || phase !== 'round');

  $effect(() => {
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
  .ra-track { display: flex; align-items: center; gap: 12px; padding-top: 12px; border-top: 1px solid var(--line-2); }
  .ra-track img {
    width: 56px; height: 56px; border-radius: 8px; object-fit: cover; flex-shrink: 0;
    background: var(--surface);
    transition: filter 0.8s ease, transform 0.8s ease;
  }
  .ra-track img.flou { filter: blur(14px) saturate(0.4); transform: scale(0.92); }
  .ra-id { min-width: 0; }
  .ra-id b { display: block; font-weight: 600; font-size: 18px; line-height: 1.2; overflow-wrap: anywhere; }
  .ra-id b.brouille { font-family: var(--mono); font-weight: 500; font-size: 14px; color: #8587a0; letter-spacing: 0.02em; }
  .ra-id small { display: block; font-size: 14px; color: var(--muted); margin-top: 3px; }
  .ra-secret { font-style: italic; }
  .ra-voir {
    min-height: 44px; margin-top: 8px; padding: 0 14px; border-radius: 999px;
    border: 1px solid var(--line-2); background: none; color: var(--text);
    font-family: var(--titre); font-weight: 700; font-size: 15px; letter-spacing: 0.04em;
    text-transform: uppercase; cursor: pointer;
  }
  .ra-voir:hover { border-color: var(--accent); color: var(--accent); }
</style>
