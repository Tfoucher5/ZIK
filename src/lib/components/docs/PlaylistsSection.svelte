<script>
  import DocTip from './DocTip.svelte';
</script>

<section>
  <h2 id="playlists">Playlists</h2>

  <h3>Playlists officielles</h3>
  <p>
    L'équipe ZIK maintient un catalogue de <strong>playlists officielles</strong> couvrant tous les genres musicaux : pop, rap, rock, électro, R&B, années 80/90/2000, hits internationaux, musiques de films, et bien plus. Ces playlists sont mises à jour régulièrement pour rester actuelles. Elles apparaissent avec un badge "Officiel" et sont disponibles dans toutes les rooms officielles correspondantes.
  </p>

  <h3>Créer une playlist personnalisée</h3>
  <p>Pour créer votre propre playlist (compte requis) :</p>
  <ol class="doc-list">
    <li>Rendez-vous sur <a href="/playlists">Playlists</a> → "Créer une playlist"</li>
    <li>Donnez-lui un nom et une description</li>
    <li>Ajoutez des titres depuis la barre d'ajout : recherche instantanée, liste collée, lien Deezer ou YouTube</li>
    <li>Choisissez si la playlist est publique ou privée</li>
    <li>Sauvegardez</li>
  </ol>

  <h3 id="ajout-rapide">Remplir une playlist rapidement</h3>
  <p>
    Une seule barre sert à tout ajouter. <strong>Tapez un titre</strong> : les résultats s'affichent pendant la frappe, <strong>Entrée</strong> ajoute le premier et les flèches permettent d'en choisir un autre. Cliquez sur un artiste ou un album pour parcourir ses titres et tout ajouter d'un coup.
  </p>
  <p>
    Vous avez déjà une liste ? <strong>Collez-la</strong> (une ligne par titre, « Artiste - Titre » de préférence) : ZIK retrouve chaque morceau et signale ceux à vérifier. Quand la barre est vide, des suggestions basées sur votre playlist vous attendent.
  </p>

  <h3 id="choisir-version">Choisir la version d'un titre</h3>
  <p>
    Le bouton <strong>▶</strong> d'un titre de votre playlist fait écouter la vidéo YouTube qui sera jouée en partie. Si ce n'est pas la bonne, « Changer de version » propose d'autres résultats, ou collez directement un lien YouTube. Pour une version spéciale (live, remix, 8-bit...), collez son lien YouTube dans la barre d'ajout et précisez-la dans le titre.
  </p>
  <p>
    Une version vérifiée vaut pour toutes les playlists : si elle est fausse, signalez-la depuis ce même panneau.
  </p>

  <h3>Importer depuis Deezer</h3>
  <p>
    Même principe avec Deezer : copiez le lien de votre playlist Deezer (Format : <code>https://www.deezer.com/fr/playlist/...</code>) et collez-le dans la barre d'ajout : un aperçu s'affiche, puis un clic importe tous les titres.
  </p>

  <DocTip label="Conseil pour le Mode Salon :">
    Créez une playlist dédiée à votre événement avant la soirée. Importez vos favoris depuis Deezer, ajustez manuellement si besoin, puis sélectionnez cette playlist lors de la création de votre salon.
  </DocTip>

  <h3>Partager une playlist</h3>
  <p>
    Une playlist publique est visible par tous les joueurs ZIK et peut être utilisée par n'importe qui pour créer une room custom ou un salon. Une playlist privée n'est accessible qu'à vous. Vous pouvez modifier la visibilité à tout moment depuis les paramètres de la playlist.
  </p>

  <DocTip warn label="Respect du droit d'auteur :">
    Les playlists ZIK utilisent des extraits de 30 secondes conformément aux accords de licence musicale. Ne publiez pas de playlists à des fins commerciales sans autorisation.
  </DocTip>
</section>
