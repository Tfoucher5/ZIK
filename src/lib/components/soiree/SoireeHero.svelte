<script>
  import { FREE_MAX_PLAYERS } from '$lib/data/proPlans.js';

  const CODE = '7F3K2Q';
  // Motif fixe façon QR, purement décoratif (non scannable)
  const QR = '1110111010010110111011000101011101010001101101011101011100011010110110111011101'
    .split('')
    .map((c) => c === '1');
</script>

<section class="sh">
  <div class="sh-text">
    <p class="sh-kicker">ZIK Soirée · Blind test sur la TV</p>
    <h1>La TV diffuse.<br /><span>Les téléphones répondent.</span></h1>
    <p class="sh-lead">
      Un écran, du son, et les téléphones que vos invités ont déjà en poche. ZIK s'occupe des extraits, du chrono,
      des points et du classement. Rien à installer, et aucun compte demandé aux joueurs.
    </p>
    <div class="sh-actions">
      <a href="/salon" class="btn-accent">Lancer une soirée</a>
      <a href="/pro" class="sh-link">Voir ZIK Pro</a>
    </div>
    <p class="sh-note">Gratuit jusqu'à {FREE_MAX_PLAYERS} joueurs</p>
  </div>

  <div class="sh-scene" aria-hidden="true">
    <div class="tv">
      <div class="tv-screen">
        <p class="tv-kicker">Rejoignez la partie</p>
        <div class="tv-row">
          <div class="tv-code">
            <small>zik-music.fr/salon/play</small>
            <div class="tv-cases">{#each CODE.split('') as c, i (i)}<b>{c}</b>{/each}</div>
            <small class="tv-count">14 joueurs connectés</small>
          </div>
          <div class="tv-qr">{#each QR as on, i (i)}<i class:on></i>{/each}</div>
        </div>
      </div>
      <div class="tv-foot"></div>
    </div>

    <div class="phone">
      <div class="ph-notch"></div>
      <p class="ph-label">Code de la soirée</p>
      <div class="ph-field mono">{CODE}</div>
      <p class="ph-label">Ton pseudo</p>
      <div class="ph-field">Julie<span class="ph-caret"></span></div>
      <div class="ph-btn">Rejoindre</div>
    </div>
  </div>
</section>

<style>
  .sh {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    gap: clamp(32px, 5vw, 72px);
    align-items: center;
    max-width: 1240px;
    margin: 0 auto;
    padding: clamp(56px, 9vh, 112px) clamp(16px, 5vw, 64px) clamp(48px, 8vh, 96px);
  }
  .sh-kicker {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 18px;
  }
  h1 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2.8rem, 5.6vw, 5.6rem);
    line-height: 0.9;
    text-transform: uppercase;
    letter-spacing: -0.01em;
  }
  h1 span { color: var(--mid); }
  .sh-lead {
    margin-top: 24px;
    max-width: 46ch;
    font-size: 1.05rem;
    line-height: 1.55;
    color: var(--mid);
  }
  .sh-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px 24px;
    margin-top: 32px;
  }
  .sh-actions .btn-accent { padding: 14px 26px; }
  .sh-link {
    font-weight: 700;
    color: var(--text);
    text-decoration: underline;
    text-underline-offset: 4px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  .sh-link:hover { color: var(--accent); }
  .sh-note {
    margin-top: 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--dim);
  }

  /* ── Scène : une TV et un téléphone, en HTML ── */
  .sh-scene { display: flex; align-items: flex-end; padding-bottom: 32px; }
  .tv {
    flex: 1;
    min-width: 0;
    border: 2px solid var(--text);
    box-shadow: 8px 8px 0 var(--accent);
    background: #000;
    padding: 10px;
  }
  .tv-screen {
    aspect-ratio: 16 / 9;
    background: #080808;
    color: #fff;
    padding: clamp(14px, 3vw, 32px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
  }
  .tv-kicker {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(1.1rem, 2.4vw, 2rem);
    text-transform: uppercase;
    line-height: 1;
  }
  .tv-row { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .tv-code small {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: clamp(0.5rem, 0.8vw, 0.68rem);
    color: rgb(255 255 255 / 0.55);
  }
  .tv-cases { display: flex; gap: 5px; margin: 8px 0; }
  .tv-cases b {
    display: grid;
    place-items: center;
    width: clamp(20px, 2.3vw, 34px);
    aspect-ratio: 4 / 5;
    border: 2px solid rgb(255 255 255 / 0.85);
    font-family: 'JetBrains Mono', monospace;
    font-size: clamp(0.8rem, 1.4vw, 1.2rem);
    font-weight: 700;
  }
  .tv-count { color: #ff4fff !important; }
  .tv-qr {
    flex-shrink: 0;
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    width: clamp(60px, 6.5vw, 96px);
    aspect-ratio: 1;
    padding: 6px;
    background: #fff;
    box-shadow: 5px 5px 0 #ff00ff;
  }
  .tv-qr .on { background: #000; }
  .tv-foot { height: 6px; }

  .phone {
    position: relative;
    z-index: 1;
    flex: 0 0 clamp(132px, 13vw, 168px);
    margin: 0 0 -32px -28px;
    padding: 22px 12px 14px;
    background: var(--bg);
    color: var(--text);
    border: 2px solid var(--text);
    border-radius: 22px;
    font-size: 0.7rem;
  }
  .ph-notch {
    position: absolute;
    top: 8px;
    left: 50%;
    width: 40px;
    height: 5px;
    margin-left: -20px;
    border-radius: 3px;
    background: var(--border2);
  }
  .ph-label { color: var(--mid); margin: 6px 0 4px; }
  .ph-field {
    padding: 7px 8px;
    border: 1px solid var(--border2);
    background: var(--surface);
    font-weight: 700;
  }
  .ph-field.mono { font-family: 'JetBrains Mono', monospace; letter-spacing: 0.2em; }
  .ph-caret {
    display: inline-block;
    width: 1px;
    height: 0.9em;
    margin-left: 2px;
    vertical-align: -1px;
    background: var(--accent);
    animation: caret 1s steps(1) infinite;
  }
  @keyframes caret { 50% { opacity: 0; } }
  .ph-btn {
    margin-top: 10px;
    padding: 8px;
    text-align: center;
    background: var(--accent);
    color: #fff;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  @media (prefers-reduced-motion: reduce) {
    .ph-caret { animation: none; }
  }
  :global(.no-animations) .ph-caret { animation: none; }

  @media (max-width: 900px) {
    .sh { grid-template-columns: minmax(0, 1fr); }
    .sh-scene { flex-direction: column; align-items: center; padding-bottom: 0; }
    .tv { width: 100%; }
    .phone { flex-basis: auto; width: 200px; margin: 20px 0 0; }
  }
</style>
