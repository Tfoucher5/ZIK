<script>
  import DocTable from './DocTable.svelte';
  import { rarityConditions } from './tables.js';
</script>

<section>
  <h2 id="cartes">Cartes musicales</h2>

  <p>
    Chaque titre du catalogue ZIK a sa carte, avec sa pochette, son album, son année et sa popularité. Les cartes ne s'achètent pas : elles se gagnent uniquement en jouant, et se rangent dans votre <a href="/collection">collection</a>. <a href="/cartes">Découvrir les cartes et leurs raretés</a>.
  </p>

  <h3>Gagner une carte</h3>
  <ul class="doc-list">
    <li><strong>Soyez le premier à trouver le titre</strong> : artiste, titre et invités en mode classique, la bonne réponse en mode QCM.</li>
    <li>Il faut un <strong>compte</strong>, une partie d'au moins <strong>5 manches</strong> dans une room d'au moins <strong>100 titres</strong> (sur une petite playlist, on connaît vite les titres par cœur), et au moins <strong>2 joueurs connectés</strong> qui jouent vraiment. Les cartes ne se gagnent pas en solo.</li>
    <li>Si le premier à trouver joue en invité, la carte revient au joueur connecté suivant.</li>
    <li>Sur une playlist que vous avez créée, il faut au moins deux autres joueurs dans la room.</li>
    <li>Un titre ajouté à une playlist depuis moins de 24 heures ne donne pas encore de carte.</li>
  </ul>

  <h3>Où gagner des cartes</h3>
  <p>
    Sur la page des <a href="/rooms">rooms</a>, une pastille <strong>Cartes</strong> signale les rooms où l'on peut en gagner, et le filtre <strong>Cartes</strong> n'affiche qu'elles. Les rooms où des joueurs connectés sont déjà en train de jouer passent en tête : c'est là que vous trouverez les adversaires qu'il faut pour gagner des cartes.
  </p>

  <h3>Les six raretés</h3>
  <p>
    La rareté d'une carte dépend de la popularité du titre sur Deezer : plus un titre est écouté dans le monde, plus sa carte est rare. Elle est fixée à la création de la carte et ne baisse jamais. Seule exception : un titre sorti depuis moins d'un an peut encore monter de rareté, le temps que sa popularité se stabilise.
  </p>
  <DocTable {...rarityConditions} />

  <h3>Garder ses cartes</h3>
  <ul class="doc-list">
    <li>Une carte gagnée en manche est <strong>provisoire</strong>. Elle est <strong>sécurisée</strong> quand vous avez joué la moitié des manches de la partie, par exemple la manche 5 sur 10. Le suivi s'affiche à côté du classement.</li>
    <li>Si vous quittez la partie avant, vos cartes provisoires sont perdues. ZIK vous prévient avant de partir.</li>
    <li>Pour un compte créé depuis moins de 24 heures, les cartes gagnées arrivent dans la collection une fois ces 24 heures passées.</li>
    <li>Une carte se possède une seule fois : si le premier à trouver l'a déjà, elle revient au joueur suivant qui remplit les conditions.</li>
  </ul>

  <h3>Collection et sets</h3>
  <p>
    La collection se parcourt par carte, par artiste ou par album, avec une recherche et des filtres par rareté, genre et décennie. Un artiste ou un album dont ZIK propose au moins trois titres forme un <strong>set</strong> : les cartes qui vous manquent y apparaissent en silhouette, sans dévoiler le titre. Compléter un set l'affiche comme terminé dans votre collection.
    Quand il ne vous manque plus qu'une carte pour finir un set, ZIK vous prévient et vous indique une room où elle passe.
  </p>
  <p>
    Une carte Mythique qui tombe est annoncée dans le chat de la room, et vos amis sont prévenus dès qu'elle est à vous pour de bon.
  </p>

  <h3>Partager une carte</h3>
  <p>
    Ouvrez une carte en grand pour l'incliner, la retourner, sortir son disque et la partager : ZIK prépare une image de la carte à envoyer, avec le lien vers sa page.
  </p>
</section>
