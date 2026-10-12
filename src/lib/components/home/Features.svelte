<script>
  import { reveal } from './reveal.js';
</script>

<section class="features" use:reveal>
  <h2 class="feat-title">Tout <em>ZIK</em>, en un coup d'œil</h2>
  <div class="feat-grid">
    <a href="/salon" class="feat-item">
      <span class="feat-tag">Grand écran + téléphones</span>
      <div class="feat-name">Mode Salon</div>
      <p class="feat-desc">La musique passe sur la TV, chaque invité répond depuis son téléphone. Sans appli, sans compte pour les joueurs.</p>
      <span class="feat-go">Organiser une soirée →</span>
    </a>
    <a href="/zikle" class="feat-item">
      <span class="feat-tag">Chaque jour · Sans compte</span>
      <div class="feat-name">Zikle</div>
      <p class="feat-desc">Une chanson du jour à deviner en 6 essais, la même pour tout le monde. Enchaîne les jours pour faire grimper ta série.</p>
      <span class="feat-go">Jouer au Zikle →</span>
    </a>
    <a href="/playlists" class="feat-item">
      <span class="feat-tag">Deezer</span>
      <div class="feat-name">Tes playlists</div>
      <p class="feat-desc">Importe tes playlists Deezer ou pioche dans celles de la communauté, puis lance une partie avec.</p>
      <span class="feat-go">Voir les playlists →</span>
    </a>
    <a href="/classements" class="feat-item">
      <span class="feat-tag">Classement · Défi · Succès</span>
      <div class="feat-name">Progresse</div>
      <p class="feat-desc">Avec un compte gratuit : classement ELO, défi collectif chaque semaine, succès à débloquer et amis à défier.</p>
      <span class="feat-go">Voir les classements →</span>
    </a>
  </div>
</section>

<style>
  .features {
    padding: 72px 48px;
    background: var(--bg);
    border-top: 1px solid rgb(var(--c-glass) / 0.05);
  }
  .feat-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2rem, 4vw, 3rem);
    text-transform: uppercase;
    letter-spacing: -1px;
    margin-bottom: 48px;
  }
  .feat-title em { color: var(--accent); font-style: normal; }
  .feat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 2px;
  }
  .feat-item {
    display: flex;
    flex-direction: column;
    padding: 28px 24px;
    border: 1px solid rgb(var(--c-glass) / 0.1);
    transition: border-color 0.15s, background 0.15s;
  }
  .feat-item:hover {
    border-color: rgb(var(--accent-rgb) / 0.45);
    background: rgb(var(--accent-rgb) / 0.04);
  }
  .feat-desc {
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--mid);
    margin-top: 10px;
    flex: 1;
  }
  .feat-go {
    margin-top: 16px;
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--accent);
  }
  .feat-item:hover .feat-go { text-decoration: underline; text-underline-offset: 3px; }
  .feat-tag {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--accent);
    display: block;
    margin-bottom: 8px;
  }
  .feat-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.4rem;
    text-transform: uppercase;
    letter-spacing: -0.2px;
    line-height: 1.05;
  }

  @media (max-width: 900px) {
    .features { padding: 48px 24px; }
    .feat-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 600px) {
    .features { padding: 60px 16px; }
    .feat-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
    .feat-name { font-size: 1.1rem; }
  }
</style>
