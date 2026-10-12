<section>
  <h2 id="faq">FAQ</h2>
  <p>Réponses aux questions les plus fréquentes.</p>

  <div class="faq-list">
    <details class="faq-item">
      <summary>Qu'est-ce que Zikle ?</summary>
      <div class="faq-body">
        <p>
          Zikle est le jeu quotidien de ZIK : une seule chanson par jour, la même pour tous les joueurs, à deviner en 6 essais maximum à partir d'un extrait audio qui s'allonge à chaque erreur (1s, 2s, 4s, 7s, 11s, 16s). Il se joue seul, sans compte, et un nouveau titre tombe chaque jour à minuit heure de Paris. Voir <a href="/zikle">la page du jeu</a>.
        </p>
      </div>
    </details>

    <details class="faq-item">
      <summary>Faut-il un compte pour jouer à Zikle ?</summary>
      <div class="faq-body">
        <p>
          Non pour le Zikle du jour : il est accessible librement, sans inscription. Un compte gratuit est en revanche nécessaire pour rejouer les journées passées dans les <a href="/zikle/archives">archives</a>, apparaître au classement du jour et conserver durablement sa série. Sans compte, la progression est stockée uniquement dans le navigateur utilisé.
        </p>
      </div>
    </details>

    <details class="faq-item">
      <summary>D'où viennent les chansons de Zikle ?</summary>
      <div class="faq-body">
        <p>
          Les titres sont tirés du top Deezer, rafraîchi automatiquement chaque semaine : ce sont donc uniquement des morceaux populaires, pas des titres obscurs. Un même titre ne peut pas être rejoué avant 365 jours, ce qui évite toute répétition sur une année.
        </p>
      </div>
    </details>

    <details class="faq-item">
      <summary>Pourquoi ma réponse n'est pas acceptée alors qu'elle est correcte ?</summary>
      <div class="faq-body">
        <p>
          Vérifiez d'abord que vous n'avez pas inversé artiste et titre dans un champ dédié. En saisie libre, tapez d'abord l'artiste puis le titre, ou alternez. Si le problème persiste, il peut s'agir d'une orthographe alternative — essayez sans accents, sans apostrophes, ou une version simplifiée du nom. Par exemple, "The Weeknd" doit être tapé exactement ainsi (pas "Weeknd" seul). Si votre saisie est correcte et n'est toujours pas acceptée, signalez-le via le bouton de feedback en partie.
        </p>
      </div>
    </details>

    <details class="faq-item">
      <summary>Est-ce que ZIK fonctionne sur mobile ?</summary>
      <div class="faq-body">
        <p>
          Oui, entièrement. ZIK est optimisé pour mobile (responsive design). La saisie de réponses sur clavier tactile peut être légèrement moins rapide que sur clavier physique, mais l'expérience reste complète. En Mode Salon, l'interface joueur est spécifiquement conçue pour les smartphones.
        </p>
      </div>
    </details>

    <details class="faq-item">
      <summary>Pourquoi n'entends-je pas la musique ?</summary>
      <div class="faq-body">
        <p>
          Vérifiez d'abord que votre volume système n'est pas coupé. Ensuite, certains navigateurs bloquent la lecture automatique du son — cliquez une fois n'importe où sur la page pour "débloquer" l'audio. Sur Safari iOS, assurez-vous que le mode silencieux physique du téléphone n'est pas activé. Si le problème persiste, essayez un autre navigateur (Chrome recommandé).
        </p>
      </div>
    </details>

    <details class="faq-item">
      <summary>Comment fonctionne le mode invité ? Mes données sont-elles sauvegardées ?</summary>
      <div class="faq-body">
        <p>
          En mode invité, votre pseudo est stocké dans le <code>sessionStorage</code> de votre navigateur. Il disparaît à la fermeture de l'onglet. Vos scores ne sont pas sauvegardés en base de données — ils sont uniquement visibles pendant la partie en cours. Aucune donnée personnelle n'est collectée ni transmise. Pour sauvegarder vos scores, créez un compte gratuit.
        </p>
      </div>
    </details>

    <details class="faq-item">
      <summary>Combien de personnes peuvent jouer dans un salon ?</summary>
      <div class="faq-body">
        <p>
          Il n'y a pas de limite stricte définie pour le Mode Salon. En pratique, des groupes de 5 à 50 personnes jouent sans problème. Pour des événements très larges (100+ personnes), assurez-vous que votre connexion internet (côté hôte) est stable. Le serveur gère les connexions Socket.io en temps réel.
        </p>
      </div>
    </details>

    <details class="faq-item">
      <summary>Puis-je jouer avec mes propres chansons ?</summary>
      <div class="faq-body">
        <p>
          Pas directement depuis vos fichiers locaux. En revanche, vous pouvez importer une playlist depuis Deezer contenant vos titres favoris. ZIK utilisera ses propres extraits audio (via YouTube) pour ces titres. Si un titre n'est pas trouvé, il ne sera pas inclus dans la partie.
        </p>
      </div>
    </details>

    <details class="faq-item">
      <summary>Mon ELO a baissé alors que j'ai bien joué — pourquoi ?</summary>
      <div class="faq-body">
        <p>
          L'ELO est relatif au niveau de vos adversaires. Si vous avez terminé derrière des joueurs moins bien classés que vous, votre ELO baisse — c'était attendu de vous. À l'inverse, perdre face à des joueurs beaucoup plus forts coûte très peu. C'est la logique du vrai système ELO : le résultat compte, mais le niveau des adversaires compte autant.
        </p>
      </div>
    </details>

    <details class="faq-item">
      <summary>Comment changer mon pseudo ?</summary>
      <div class="faq-body">
        <p>
          Allez dans <a href="/profile">Profil</a> et cliquez sur l&rsquo;ic&ocirc;ne d&rsquo;&eacute;dition. Le changement est imm&eacute;diatement visible sur votre profil public et dans les parties. Le pseudo doit contenir entre 3 et 20 caract&egrave;res (lettres, chiffres, <code>_</code> et <code>-</code> autoris&eacute;s).
        </p>
      </div>
    </details>

    <details class="faq-item">
      <summary>Le Mode Salon sauvegarde-t-il les scores ?</summary>
      <div class="faq-body">
        <p>
          Non. Le Mode Salon est entièrement éphémère : les scores existent en mémoire sur le serveur pendant la durée de la session. Dès que l'hôte ferme l'onglet ou que le salon expire, tout est perdu. Si vous voulez conserver les résultats, prenez une capture d'écran du podium final affiché sur l'écran hôte.
        </p>
      </div>
    </details>

    <details class="faq-item">
      <summary>Comment supprimer mon compte ?</summary>
      <div class="faq-body">
        <p>La suppression de votre compte se fait depuis votre page de paramètres, tout en bas, dans la section "Danger". </p><br>
        <p>⚠️ - Toute suppression du compte est définitive !</p>
      </div>
    </details>

    <details class="faq-item">
      <summary>Comment signaler un joueur ou un bug en cours de partie ?</summary>
      <div class="faq-body">
        <p>
          <strong>Signaler un joueur :</strong> cliquez sur le bouton <strong>⋯</strong> à droite du nom d'un joueur dans le classement latéral, puis choisissez « Signaler ce joueur ». Un formulaire vous invite à choisir le motif (insultes, triche, spam…) et à ajouter une description. Le signalement est anonyme.
        </p>
        <p style="margin-top:10px">
          <strong>Signaler un bug :</strong> cliquez sur le bouton <strong>🐛</strong> dans le header de la page de jeu, décrivez ce qui s'est passé et envoyez. Votre room et votre pseudo sont inclus automatiquement pour nous aider à reproduire le problème.
        </p>
        <p style="margin-top:10px">
          Vous pouvez aussi nous écrire via le lien <strong>Contact</strong> dans le footer pour toute demande ou question.
        </p>
      </div>
    </details>
  </div>
</section>

<style>
  .faq-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 20px;
  }

  .faq-item {
    border: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    border-radius: 10px;
    overflow: hidden;
    background: rgb(var(--c-glass) / 0.02);
  }

  .faq-item summary {
    padding: 16px 18px;
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--text, #fff);
    cursor: pointer;
    list-style: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    transition: background 0.15s;
  }

  .faq-item summary::-webkit-details-marker {
    display: none;
  }

  .faq-item summary::after {
    content: '+';
    font-size: 1.2rem;
    color: var(--accent, #7c3aed);
    flex-shrink: 0;
    transition: transform 0.2s;
  }

  .faq-item[open] summary::after {
    transform: rotate(45deg);
  }

  .faq-item summary:hover {
    background: rgb(var(--c-glass) / 0.03);
  }

  .faq-body {
    padding: 0 18px 16px;
    border-top: 1px solid var(--border, rgb(var(--c-glass) / 0.06));
  }

  /* .faq-item en plus pour passer devant « .doc-content p » de la page */
  .faq-item .faq-body p {
    margin: 12px 0 0;
    font-size: 0.9rem;
    color: var(--mid, #aaa);
    line-height: 1.7;
  }
</style>
