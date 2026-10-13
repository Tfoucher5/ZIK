<script>
  const STEPS = [
    ['Ouvrez le salon sur l\'écran', 'Sur l\'ordinateur branché à la TV, ouvrez « Lancer une soirée » en étant connecté avec ce compte : votre logo et votre couleur s\'appliquent.'],
    ['Pilotez depuis la régie', 'Le lien de la régie s\'ouvre sur votre téléphone : vous lancez, révélez, corrigez les points et réglez le son sans toucher l\'ordinateur.'],
    ['Vos clients jouent', 'Ils scannent le QR code affiché à l\'écran, choisissent un pseudo et répondent sur leur téléphone. Aucune appli.'],
    ['Le classement se remplit', 'Les points de chaque soirée s\'additionnent dans le classement du mois de votre lieu. Il repart à zéro le 1er.'],
  ];
</script>

<section class="oh">
  <h2>Comment se passe une soirée</h2>
  <ol>
    {#each STEPS as [t, d], i (t)}
      <li><b>{i + 1}</b><div><h3>{t}</h3><p>{d}</p></div></li>
    {/each}
  </ol>
  <p class="oh-more">
    Une question ? Le <a href="/docs">guide du Mode Salon</a> répond à presque tout, sinon écrivez à
    <a href="mailto:theo@zik-music.fr">theo@zik-music.fr</a> : les comptes ZIK Pro passent en priorité.
  </p>
</section>

<style>
  .oh { margin-top: 32px; }
  .oh h2 { font-family: "Barlow Condensed", sans-serif; font-size: 1.35rem; font-weight: 800; margin-bottom: 14px; }
  ol { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
  li { display: flex; gap: 12px; }
  li > b {
    flex: none;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: rgb(var(--accent-rgb) / 0.12);
    color: var(--accent);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
  }
  h3 { font-size: 0.92rem; font-weight: 800; margin-bottom: 4px; color: var(--text); }
  li p { font-size: 0.82rem; line-height: 1.55; color: var(--mid); }
  .oh-more { margin-top: 18px; font-size: 0.85rem; color: var(--mid); }
  .oh-more a { color: var(--accent); }
</style>
