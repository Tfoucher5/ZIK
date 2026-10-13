<script>
  let { venue } = $props();
  let copied = $state(false);

  let url = $derived(`https://www.zik-music.fr/lieu/${venue.slug}`);

  async function copy() {
    await navigator.clipboard.writeText(url);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="vk">
  <div class="vn-card vk-main">
    <span class="vk-live"><i></i> Page en ligne</span>
    <p class="vk-url">zik-music.fr/lieu/<b>{venue.slug}</b></p>
    <p class="vn-card-sub">À mettre sur votre site, votre page Facebook et votre fiche Google.</p>
    <div class="vk-actions">
      <button class="vn-btn" onclick={copy}>{copied ? 'Lien copié ✓' : 'Copier le lien'}</button>
      <a class="vn-btn vn-btn-ghost" href="/lieu/{venue.slug}" target="_blank">Voir la page ↗</a>
    </div>
  </div>
  <a class="vn-card vk-poster" href="/lieu/{venue.slug}/affiche" target="_blank">
    <span class="vk-sheet" aria-hidden="true"><b>Blind<br />test</b><i></i></span>
    <span><b>Affiche A4</b><small>Avec QR code, prête à imprimer</small></span>
  </a>
</div>

<style>
  .vk { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 20px; margin-bottom: 28px; }
  .vk-live {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--success);
  }
  .vk-live i { width: 8px; height: 8px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 4px rgb(74 222 128 / 0.2); }
  .vk-url { margin: 10px 0 4px; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 1.05rem; color: var(--mid); overflow-wrap: anywhere; }
  .vk-url b { color: var(--text); font-weight: 600; }
  .vk-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
  .vk-poster { display: flex; align-items: center; gap: 16px; color: var(--text); text-decoration: none; transition: border-color 0.15s; }
  .vk-poster:hover { border-color: var(--accent); }
  .vk-poster > span:last-child { display: flex; flex-direction: column; gap: 4px; }
  .vk-poster small { font-size: 0.8rem; color: var(--mid); }
  .vk-sheet {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    width: 64px;
    height: 90px;
    padding: 10px 6px 8px;
    border-radius: 4px;
    background: #fff;
    box-shadow: 0 6px 18px rgb(0 0 0 / 0.18);
    color: #000;
    font-family: "Barlow Condensed", sans-serif;
    font-size: 0.8rem;
    font-weight: 900;
    line-height: 0.85;
    text-transform: uppercase;
    text-align: center;
  }
  .vk-sheet i { width: 26px; height: 26px; background: repeating-conic-gradient(#000 0 25%, #fff 0 50%) 0 0 / 6px 6px; }
  @media (max-width: 760px) {
    .vk { grid-template-columns: 1fr; }
  }
</style>
