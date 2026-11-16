<!-- Hero : la vidéo du bar avance avec le scroll, les légendes se relaient -->
<script>
  import ScrubVideo from '$lib/components/ui/ScrubVideo.svelte';
  import { CAPTIONS, CREER, HERO } from '$lib/components/soiree/soireeContent.js';

  const M = '/media/soiree/bar-';
  let p = $state(0);
</script>

<section id="scene" class="scene" class:cap={p >= 0.1} aria-labelledby="h1">
  <ScrubVideo
    sources={{ portrait: `${M}portrait-v1.mp4`, paysage: `${M}paysage-v1.mp4` }}
    poster={{ portrait: `${M}portrait-v1.webp`, paysage: `${M}paysage-v1.webp` }}
    alt="Un bar le soir : la TV ZIK au mur, les joueurs répondent sur leur téléphone"
    len={6}
    priority
    onprogress={(v) => (p = v)}
  >
    <div class="scrim" aria-hidden="true"></div>
    <div class="ov hero" class:on={p < 0.1}>
      <span class="label"><i></i>ZIK Soirée<span class="long"> · bars, campings, entreprises, chez soi</span></span>
      <h1 id="h1"><span class="ln"><span>Le blind test</span></span> <span class="ln"><span>qui fait <span class="mag">la soirée</span></span></span></h1>
      <p class="lead">{HERO.lead}</p>
      <div class="ctas">
        <a class="btn-main" href={CREER}>Créer une soirée</a>
        <a class="btn-line" href="#deroule">Voir le déroulé</a>
      </div>
      <ul class="facts">{#each HERO.facts as f (f)}<li>{f}</li>{/each}</ul>
      <div class="cue" aria-hidden="true">Faites défiler</div>
    </div>
    {#each CAPTIONS as c (c.title)}
      <div class="ov legende" class:on={p >= c.from && p < c.to}>
        <span class="label"><i></i>{c.label}</span>
        <h2 class="grad">{c.title}</h2>
        <p>{c.text}{#if c.pro}<span class="pro-tag">ZIK Pro</span>{/if}</p>
      </div>
    {/each}
    <div class="barre" aria-hidden="true"><i style:transform="scaleX({p})"></i></div>
  </ScrubVideo>
</section>

<style>
  .scene { position: relative; padding: 0; background: #060409; }
  .scrim { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(6, 4, 9, 0.9) 0%, rgba(6, 4, 9, 0.6) 42%, transparent 52%, rgba(6, 4, 9, 0.94) 76%, rgba(6, 4, 9, 0.96) 100%); }
  .cap .scrim { background: linear-gradient(180deg, rgba(6, 4, 9, 0.5) 0%, transparent 14%, transparent 52%, rgba(6, 4, 9, 0.94) 76%); }
  /* Hors .on : invisible aussi pour le clavier et les lecteurs d'écran (visibility après le fondu) */
  .ov { position: absolute; left: 0; right: 0; z-index: 2; opacity: 0; visibility: hidden; transform: translateY(18px); transition: opacity 0.45s, transform 0.45s var(--out), visibility 0s 0.45s; pointer-events: none; padding-inline: var(--gut); }
  .ov.on { opacity: 1; visibility: visible; transform: none; pointer-events: auto; transition-delay: 0s; }
  .hero { top: calc(var(--top) + 28px); display: grid; justify-items: center; text-align: center; }
  h1 { margin-top: 16px; font-weight: 900; font-size: clamp(3rem, 14vw, 8.6rem); line-height: 0.84; letter-spacing: -0.015em; }
  .ln { display: block; overflow: hidden; padding-bottom: 0.05em; }
  .ln > span { display: inline-block; animation: monte 1.1s var(--expo) both; }
  .ln + .ln > span { animation-delay: 0.12s; }
  @keyframes monte { from { transform: translateY(110%); } }
  .mag { background: linear-gradient(90deg, #ff00ff, #ff8af5, #ff00ff); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: sheen 6s linear infinite; }
  @keyframes sheen { to { background-position: -200% 0; } }
  .lead { margin-top: 14px; max-width: 30em; font-size: 1rem; color: #e2e3ee; }
  .ctas { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 18px; }
  .facts { display: none; list-style: none; margin: 14px 0 0; padding: 0; gap: 8px 18px; flex-wrap: wrap; font-size: 13px; color: var(--soft); }
  .facts li::before { content: '✓ '; color: var(--ok); }
  .long { display: none; }
  .cue { display: none; margin-top: 22px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); gap: 8px; }
  .cue::after { content: ''; width: 1px; height: 34px; background: linear-gradient(var(--accent), transparent); animation: drip 1.8s infinite; }
  @keyframes drip { 0% { transform: scaleY(0); transform-origin: top; } 50% { transform: scaleY(1); transform-origin: top; } 51% { transform-origin: bottom; } 100% { transform: scaleY(0); transform-origin: bottom; } }
  .legende { bottom: calc(26px + env(safe-area-inset-bottom, 0px)); display: grid; gap: 10px; }
  .legende > * { max-width: 520px; }
  .legende h2 { font-weight: 900; font-size: clamp(2.3rem, 10vw, 4.4rem); }
  .legende p { color: #d9dae6; font-size: 1rem; }
  .barre { position: absolute; left: var(--gut); right: var(--gut); bottom: calc(10px + env(safe-area-inset-bottom, 0px)); height: 2px; border-radius: 2px; background: rgba(255, 255, 255, 0.1); z-index: 3; }
  .barre i { position: absolute; inset: 0; background: linear-gradient(90deg, var(--violet), var(--accent)); transform-origin: left; }

  /* Mouvements réduits : poster dans le flux, puis toutes les légendes (.rm et media, sans attendre le JS) */
  :global(html.rm) .scene { background: none; }
  :global(html.rm) .scene :global(.sticky) { display: flex; flex-direction: column; padding: calc(var(--top) + 40px) var(--gut) 60px; gap: 40px; }
  :global(html.rm) .scene :global(picture) { order: 1; }
  :global(html.rm) .scene :global(img) { border-radius: 18px; max-height: 80svh; object-fit: cover; }
  :global(html.rm) .ov { position: relative; inset: auto; opacity: 1; visibility: visible; transform: none; translate: none; width: auto; padding: 0; pointer-events: auto; }
  :global(html.rm) .legende { order: 2; }
  :global(html.rm) .scrim,
  :global(html.rm) .barre,
  :global(html.rm) .cue { display: none; }

  @media (min-width: 900px) {
    .scrim, .cap .scrim { background: linear-gradient(90deg, rgba(6, 4, 9, 0.94) 0%, rgba(6, 4, 9, 0.8) 30%, rgba(6, 4, 9, 0.4) 46%, transparent 60%), linear-gradient(180deg, transparent 75%, rgba(6, 4, 9, 0.7)); }
    .hero { top: 50%; translate: 0 -50%; justify-items: start; text-align: left; width: min(780px, 54vw); left: var(--gut); right: auto; padding: 0; }
    h1 { font-size: clamp(3rem, 7vw, 7rem); }
    .lead { font-size: 1.2rem; }
    .ctas { justify-content: flex-start; }
    .facts { display: flex; }
    .long { display: inline; }
    .cue { display: grid; justify-items: start; }
    .legende { top: 50%; bottom: auto; translate: 0 -50%; left: var(--gut); right: auto; width: min(460px, 40vw); padding: 0; }
    .legende h2 { font-size: clamp(3rem, 5vw, 4.8rem); }
    .legende p { font-size: 1.15rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .scene { background: none; }
    .scene :global(.sticky) { display: flex; flex-direction: column; padding: calc(var(--top) + 40px) var(--gut) 60px; gap: 40px; }
    .scene :global(picture) { order: 1; }
    .scene :global(img) { border-radius: 18px; max-height: 80svh; object-fit: cover; }
    .scene .ov { position: relative; inset: auto; opacity: 1; visibility: visible; transform: none; translate: none; width: auto; padding: 0; pointer-events: auto; }
    .scene .legende { order: 2; }
    .scene .scrim, .scene .barre, .scene .cue { display: none; }
    .ln > span { animation: none; }
  }
</style>
