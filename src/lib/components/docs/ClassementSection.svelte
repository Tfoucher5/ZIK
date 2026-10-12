<script>
  import DocTip from './DocTip.svelte';
</script>

<section>
  <h2 id="classement">Classements</h2>

  <h3>ELO depuis toujours</h3>
  <p>
    Le classement ELO est le classement de référence de ZIK. Il utilise un <strong>vrai système ELO pairwise</strong> : votre ELO évolue en fonction du niveau de chacun de vos adversaires, pas seulement de votre position finale.
  </p>
  <p>Concrètement, à la fin de chaque partie vous êtes comparé individuellement à chaque autre joueur :</p>
  <ul class="doc-list">
    <li><strong>Battre un joueur mieux classé</strong> → gros gain ELO (c'était inattendu)</li>
    <li><strong>Battre un joueur moins bien classé</strong> → petit gain ELO (c'était attendu)</li>
    <li><strong>Perdre contre un joueur mieux classé</strong> → petite perte ELO</li>
    <li><strong>Perdre contre un joueur moins bien classé</strong> → grosse perte ELO</li>
  </ul>
  <p>
    La vitesse d'évolution (K-factor) diminue avec l'expérience : les nouveaux joueurs progressent vite, les joueurs expérimentés ont un ELO plus stable. Votre ELO n'évolue que dans les <strong>rooms publiques avec au minimum 3 joueurs</strong>.
  </p>

  <h3>Classement hebdomadaire</h3>
  <p>
    En parallèle du classement ELO général, un <strong>classement hebdomadaire</strong> repart de zéro chaque lundi à minuit. Il prend en compte le total de points bruts accumulés durant la semaine. Il donne sa chance à tout le monde, même aux joueurs avec un ELO faible, de briller sur une semaine donnée.
  </p>

  <DocTip label="Progression ELO :">
    Pour progresser efficacement, cherchez des adversaires de niveau proche ou supérieur au vôtre. Battre un joueur à 1 400 ELO quand vous êtes à 1 000 rapporte beaucoup plus que battre un débutant. Rappel : il faut une room publique avec au moins 3 joueurs.
  </DocTip>

  <h3>Collectionneurs de cartes</h3>
  <p>
    L'onglet <strong>Cartes</strong> classe les collectionneurs avec un score qui compte plus pour les cartes rares : 1 point pour une Commune, 2 pour une Peu commune, 4 pour une Rare, 8 pour une Épique, 16 pour une Légendaire et 32 pour une Mythique. Chaque joueur y montre ses plus belles cartes, à ouvrir en grand, et la répartition de sa collection par rareté. Pour un profil privé, seuls les chiffres apparaissent.
  </p>

  <h3>Consulter les classements</h3>
  <p>
    Les classements sont accessibles depuis la page d'accueil (section "Classements") ou directement via le menu. Votre propre rang est mis en évidence dans la liste.
  </p>
</section>
