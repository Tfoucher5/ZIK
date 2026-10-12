<script>
  import DocTip from './DocTip.svelte';
</script>

<section>
  <h2 id="zikle">Zikle - la chanson du jour</h2>

  <h3>Le principe</h3>
  <p>
    <a href="/zikle">Zikle</a> est un jeu solo quotidien : <strong>un seul titre par jour</strong>, le même pour tout le monde, à deviner en <strong>6 essais maximum</strong>. Vous démarrez avec 1 seconde d'extrait ; à chaque essai raté ou passé, la fenêtre d'écoute s'agrandit — 1s, 2s, 4s, 7s, 11s, puis 16s. Plus vous trouvez tôt, meilleur est votre score.
  </p>
  <p>
    Aucun compte n'est nécessaire pour jouer le Zikle du jour. Un nouveau titre tombe chaque jour à minuit (heure de Paris).
  </p>

  <h3>D'où viennent les titres ?</h3>
  <p>
    Les titres proviennent du <strong>top Deezer</strong>, rafraîchi automatiquement chaque semaine. Ce ne sont donc que des morceaux qui ont réellement marché — pas de titres obscurs impossibles à reconnaître. Un même titre ne peut pas revenir avant <strong>365 jours</strong>, ce qui garantit qu'un joueur régulier ne retombera jamais deux fois sur la même chanson dans l'année.
  </p>

  <h3>Trouver la réponse</h3>
  <ol class="doc-list">
    <li>Cliquez sur <strong>Écouter</strong> pour lancer l'extrait débloqué (réglez le volume avec le curseur juste en dessous)</li>
    <li>Tapez un titre ou un artiste : une liste de suggestions apparaît, navigable au clavier (flèches, Entrée, Échap)</li>
    <li>Validez une suggestion pour proposer, ou cliquez sur <strong>Passer</strong> pour débloquer la suite sans proposer</li>
    <li>Chaque ligne indique son état : <strong>Trouvé</strong>, <strong>Raté</strong> (avec la proposition faite) ou <strong>Passé</strong></li>
  </ol>

  <h3>Série, classement et partage</h3>
  <p>
    Votre <strong>série</strong> compte les jours gagnés d'affilée. En fin de partie, un <strong>classement du jour</strong> réunit tous les joueurs connectés ayant joué : d'abord ceux qui ont trouvé, triés par nombre d'essais puis par rapidité, puis une section <strong>« Ont tenté »</strong> pour ceux qui n'ont pas trouvé. Votre rang y est calculé sur l'ensemble des participants et vous est rappelé même si vous n'êtes pas dans les premiers. Le bouton <strong>Partager</strong> copie une grille d'emojis sans spoiler : elle montre en combien d'essais et sur quelle durée d'extrait vous avez trouvé.
  </p>

  <h3>Archives</h3>
  <p>
    Les <a href="/zikle/archives">archives</a> regroupent tous les jours passés. Les rejouer demande un <strong>compte gratuit</strong> — le Zikle du jour, lui, reste toujours libre d'accès. Les jours déjà terminés y apparaissent avec votre score.
  </p>

  <DocTip label="Connectez-vous pour garder vos stats :">
    sans compte, votre série et votre historique ne vivent que dans le navigateur utilisé (ils disparaissent si vous videz son cache). Avec un compte, tout est conservé, vous apparaissez au classement et vous gagnez de l'XP à chaque victoire.
  </DocTip>
</section>
