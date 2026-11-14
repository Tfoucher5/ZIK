<!-- Deux portes de même taille : le jeu en ligne suit le thème, la soirée est toujours de nuit -->
<script>
  import { onMount } from 'svelte';
  import MiniTv from '$lib/components/soiree/MiniTv.svelte';
  import { HERO_COVERS } from '$lib/components/home/covers.js';

  let online = $state(0);

  onMount(async () => {
    const r = await fetch('/api/rooms/official').catch(() => null);
    const d = r?.ok ? await r.json().catch(() => null) : null;
    online = d?.totalOnline ?? 0;
  });
</script>

<div class="doors">
  <section class="door door-jeu" aria-labelledby="door-jeu-t">
    <div class="covers" aria-hidden="true">
      {#each HERO_COVERS.slice(0, 8) as url (url)}<img src={url} alt="" loading="lazy" width="120" height="120" />{/each}
    </div>
    <div class="door-body">
      <h2 id="door-jeu-t" class="door-kicker">Jouer en ligne</h2>
      <p class="door-txt">Affronte d'autres joueurs dans les rooms ou avec tes playlists Deezer. Le Zikle du jour, les classements et tes succès t'attendent.</p>
      {#if online > 0}<p class="door-live">{online} {online > 1 ? 'joueurs' : 'joueur'} en ligne</p>{/if}
      <a class="door-link" href="/jouer">Jouer au blind test en ligne <span aria-hidden="true">→</span></a>
    </div>
    <span class="door-word" aria-hidden="true">Jouer</span>
  </section>

  <section class="door door-soiree" aria-labelledby="door-soiree-t">
    <div class="door-tv"><MiniTv code="" /></div>
    <div class="door-body">
      <h2 id="door-soiree-t" class="door-kicker">Animer une soirée</h2>
      <p class="door-txt">La TV diffuse la musique, chaque téléphone sert de manette. Pour un lieu qui reçoit du public, ou une soirée chez soi.</p>
      <p class="door-live">Bar, camping, entreprise, association</p>
      <a class="door-link" href="/soiree">Blind test en soirée sur la TV <span aria-hidden="true">→</span></a>
      <a class="door-alt" href="/salon">Déjà organisateur ? Créer une soirée</a>
    </div>
    <span class="door-word" aria-hidden="true">Animer</span>
  </section>
</div>

<style>
  .doors {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 2px solid var(--text);
  }
  .door {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 28px;
    min-height: 480px;
    padding: 40px clamp(20px, 4vw, 56px) calc(7vw + 32px);
  }
  .door-jeu { background: var(--bg); color: var(--text); }
  .door-soiree {
    background: #080808;
    color: #fafafa;
    border-left: 2px solid var(--text);
    --mid: #8896aa;
  }
  .covers {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    margin: -40px calc(-1 * clamp(20px, 4vw, 56px)) 0;
    position: relative;
  }
  .covers img { width: 100%; height: auto; aspect-ratio: 1; object-fit: cover; display: block; filter: grayscale(1); }
  .covers::after { content: ''; position: absolute; inset: 0; background: rgb(var(--bg-rgb) / 0.82); }
  .door-tv :global(.mtv-top b) { color: #fafafa; }
  .door-tv { width: min(320px, 100%); border: 2px solid #fafafa; box-shadow: 8px 8px 0 rgb(255 255 255 / 0.2); }
  .door-body { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; max-width: 460px; }
  .door-kicker {
    margin: 0;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.6rem;
    text-transform: uppercase;
  }
  .door-txt { margin: 0; color: var(--mid); line-height: 1.5; }
  .door-live {
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .door-link {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    margin-top: 6px;
    padding: 0 20px;
    border: 2px solid currentColor;
    color: inherit;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-decoration: none;
  }
  .door-link::after { content: ''; position: absolute; inset: 0; z-index: 1; }
  .door-link span { transition: transform 0.2s; }
  .door:hover .door-link span { transform: translateX(4px); }
  .door-link:focus-visible, .door-alt:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
  .door-alt {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--mid);
    font-size: 0.9rem;
    text-underline-offset: 3px;
  }
  .door-alt:hover { color: #fafafa; }
  .door-word {
    position: absolute;
    left: clamp(12px, 3vw, 40px);
    bottom: -0.2em;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 11vw;
    line-height: 0.8;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    opacity: 0.12;
    pointer-events: none;
  }

  @media (max-width: 760px) {
    .doors { grid-template-columns: 1fr; }
    .door { min-height: 0; padding-bottom: calc(18vw + 24px); }
    .door-soiree { border-left: 0; border-top: 2px solid var(--text); }
    .door-word { font-size: 26vw; }
  }
  @media (prefers-reduced-motion: reduce) {
    .door-link span { transition: none; }
  }
  :global(.no-animations) .door-link span { transition: none; }
</style>
