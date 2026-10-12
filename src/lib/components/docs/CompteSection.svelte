<script>
  import DocTip from './DocTip.svelte';
</script>

<section>
  <h2 id="compte">Compte &amp; Profil</h2>

  <h3>Créer un compte</h3>
  <p>L'inscription est gratuite et prend moins d'une minute. Deux méthodes :</p>
  <ul class="doc-list">
    <li><strong>Email + mot de passe :</strong> Saisissez votre email, choisissez un pseudo et un mot de passe. Un email de confirmation est envoyé.</li>
    <li><strong>Google OAuth :</strong> Connexion en un clic avec votre compte Google, aucun mot de passe à retenir.</li>
  </ul>

  <h3>Mode invité</h3>
  <p>
    Sans compte, vous jouez en mode invité. Votre pseudo est stocké localement dans votre navigateur. Vos scores s'affichent en partie mais ne sont pas sauvegardés — à la prochaine session, vous repartez de zéro. Aucune donnée personnelle n'est collectée en mode invité.
  </p>

  <h3>Profil public</h3>
  <p>
    Chaque compte ZIK dispose d'un profil public accessible via <code>/user/[votre-pseudo]</code>. Il affiche :
  </p>
  <ul class="doc-list">
    <li><strong>Avatar DiceBear :</strong> Avatar généré automatiquement à partir de votre pseudo, unique et identifiable</li>
    <li><strong>Statistiques globales :</strong> Nombre de parties jouées, taux de bonnes réponses, score total accumulé</li>
    <li><strong>Meilleurs scores par room :</strong> Votre record personnel dans chaque room officielle</li>
    <li><strong>Rang ELO :</strong> Votre position dans le classement global</li>
  </ul>

  <h3>Confidentialité du profil</h3>
  <p>
    Vous pouvez rendre votre profil <strong>privé</strong> depuis les paramètres (<a href="/settings">Paramètres</a> → Confidentialité). Un profil privé n'apparaît pas dans les classements publics et n'est pas indexé par les moteurs de recherche.
  </p>

  <h3>Paramètres personnalisables</h3>
  <ul class="doc-list">
    <li><strong>Animations :</strong> Désactivez les animations pour améliorer les performances ou réduire les distractions visuelles</li>
    <li><strong>Volume par défaut :</strong> Réglez le volume de lecture des extraits musicaux (conservé entre les sessions)</li>
    <li><strong>Confidentialité :</strong> Profil public ou privé</li>
    <li><strong>Pseudo :</strong> Modifiable une fois toutes les 30 jours</li>
  </ul>

  <DocTip warn label="Sécurité :">
    Ne partagez jamais votre mot de passe. ZIK ne vous demandera jamais votre mot de passe par email ou message. En cas de doute, utilisez la fonctionnalité "Mot de passe oublié".
  </DocTip>
</section>
