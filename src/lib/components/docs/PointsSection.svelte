<script>
  import DocTable from './DocTable.svelte';
  import { basePoints, speedBonus, salonKahoot } from './tables.js';
  import DocTip from './DocTip.svelte';
</script>

<section>
  <h2 id="points">Système de points</h2>

  <h3>Points de base</h3>
  <DocTable {...basePoints} />

  <h3>Le bonus vitesse (mode texte libre)</h3>
  <p>
    En mode texte libre, un bonus vitesse récompense les joueurs qui trouvent la réponse rapidement. Il est calculé à partir du <strong>temps écoulé depuis le début de la manche</strong> et diminue progressivement. Voici des exemples concrets pour une manche de 30 secondes :
  </p>
  <DocTable {...speedBonus} />

  <h3>Le score Kahoot (Mode Salon QCM)</h3>
  <p>
    En Mode Salon avec le QCM, le scoring fonctionne différemment : <strong>plus tu réponds vite, plus tu gagnes de points</strong>. Le score maximal est de <strong>1 000 points</strong> si tu réponds immédiatement, et il descend progressivement jusqu'à un minimum de <strong>200 points</strong> si tu réponds à la dernière seconde. Répondre faux ou ne pas répondre donne 0 point.
  </p>
  <DocTable {...salonKahoot} />

  <h3>Exemple de calcul concret</h3>
  <p>Prenons la chanson <em>"Poker Face"</em> de <strong>Lady Gaga</strong> :</p>
  <ul class="doc-list">
    <li>Vous trouvez l'artiste "Lady Gaga" en <strong>4 secondes</strong> → 1 pt de base + 2 pts bonus = <strong>3 pts</strong></li>
    <li>Vous trouvez le titre "Poker Face" en <strong>10 secondes</strong> → 1 pt de base + 1 pt bonus = <strong>2 pts</strong></li>
    <li>Total pour cette manche : <strong>5 pts</strong></li>
  </ul>
  <p>Maintenant avec un featuring — <em>"Partition"</em> de <strong>Beyoncé ft. Jay-Z</strong> :</p>
  <ul class="doc-list">
    <li>Artiste "Beyoncé" en 2s → 1 + 3 = <strong>4 pts</strong></li>
    <li>Titre "Partition" en 5s → 1 + 2 = <strong>3 pts</strong></li>
    <li>Feat "Jay-Z" en 12s → 1 + 1 = <strong>2 pts</strong></li>
    <li>Total pour cette manche : <strong>9 pts</strong></li>
  </ul>

  <DocTip label="Stratégie :">
    Tapez l'artiste en premier dès que vous reconnaissez sa voix ou son style, même si vous n'avez pas encore le titre. Chaque seconde compte pour le bonus vitesse, et valider l'artiste vous libère l'esprit pour chercher le titre.
  </DocTip>

  <h3>Le classement en temps réel</h3>
  <p>
    Un tableau de scores s'affiche en temps réel dans la room, mis à jour après chaque validation. Le joueur avec le plus de points en tête de liste est celui qui a répondu le plus vite et le plus souvent correctement. En Mode Salon, le classement est affiché sur l'écran hôte entre chaque manche.
  </p>
</section>
