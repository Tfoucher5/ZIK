<script>
  import DocTable from './DocTable.svelte';
  import { qcmKahoot, classicVsQcm } from './tables.js';
  import DocTip from './DocTip.svelte';
</script>

<section>
  <h2 id="qcm">Mode QCM multijoueur</h2>

  <h3>Qu'est-ce que le mode QCM ?</h3>
  <p>
    Le <strong>Mode QCM (Choix Multiple)</strong> est une variante des rooms multijoueur classiques. Au lieu de taper librement votre réponse, 4 propositions vous sont affichées — une seule est correcte. Idéal pour les débutants ou pour des parties plus accessibles en groupe.
  </p>

  <h3>Créer une room QCM</h3>
  <p>Lors de la création d'une room (compte requis, page <a href="/rooms">Rooms</a>) :</p>
  <ol class="doc-list">
    <li>Cliquez sur <strong>"Créer une room"</strong></li>
    <li>Choisissez le <strong>mode de jeu</strong> : Classique ou QCM</li>
    <li>Configurez le reste (nom, emoji, playlist…) et créez la room</li>
  </ol>
  <p>Les rooms QCM sont clairement identifiées par un badge <strong>🎯 Mode QCM</strong> dans la liste des rooms et sur la page de la room.</p>

  <h3>Jouer en mode QCM</h3>
  <p>
    Dès que la manche commence, 4 boutons colorés apparaissent à la place du champ de saisie. Cliquez sur la bonne réponse (artiste + titre) avant la fin du temps imparti. Un seul clic suffit pour valider — pas d'Entrée à appuyer.
  </p>
  <p>
    La bonne réponse est révélée à la fin de la manche (temps écoulé ou tous les joueurs ont répondu). Les boutons passent au vert (correct) ou au rouge (incorrect) pour chaque joueur.
  </p>

  <h3>Scoring QCM</h3>
  <p>
    En mode QCM, le scoring est <strong>Kahoot-style</strong> : plus vous répondez vite, plus vous gagnez de points. La manche se termine automatiquement dès que tous les joueurs ont répondu.
  </p>
  <DocTable {...qcmKahoot} />

  <h3>Différences avec le mode Classique</h3>
  <DocTable {...classicVsQcm} />

  <DocTip label="Attention aux leurres :">
    Les 3 mauvaises réponses sont tirées d'autres titres de la même playlist. Parfois, plusieurs chansons du même artiste peuvent apparaître — il faut vraiment reconnaître le titre, pas seulement l'artiste !
  </DocTip>
</section>
