<script>
  import DocTip from './DocTip.svelte';
</script>

<section>
  <h2 id="amis">Amis &amp; invitations</h2>

  <h3>Abonnements et amis</h3>
  <p>
    ZIK propose deux types de relations entre joueurs (compte requis) :
  </p>
  <ul class="doc-list">
    <li><strong>Suivre un joueur :</strong> comme un abonnement, sans confirmation. Vous suivez son activité depuis son profil public.</li>
    <li><strong>Ami :</strong> relation confirmée des deux côtés. Vous envoyez une demande, la personne l'accepte (ou la refuse) depuis son profil ou ses notifications.</li>
  </ul>

  <h3>Ajouter un ami</h3>
  <ul class="doc-list">
    <li><strong>Depuis un profil :</strong> ouvrez le profil public d'un joueur et cliquez sur "Demander en ami".</li>
    <li><strong>Pendant une partie :</strong> dans le classement à gauche de l'écran de jeu, ouvrez le menu <strong>⋯</strong> à côté d'un joueur et choisissez "Ajouter en ami". Si vous vous êtes demandés mutuellement, l'amitié est validée automatiquement.</li>
  </ul>

  <h3>Inviter des amis à jouer</h3>
  <ul class="doc-list">
    <li><strong>Depuis une partie :</strong> le bouton <strong>👋</strong> en haut de l'écran de jeu ouvre votre liste d'amis — un clic sur "Inviter" leur envoie une invitation pour la room où vous jouez.</li>
    <li><strong>Depuis un profil :</strong> le bouton "Inviter à jouer" sur le profil d'un ami vous laisse choisir la room de destination (votre room actuelle, vos rooms ou une room publique).</li>
  </ul>
  <p>
    L'ami invité reçoit une <strong>notification</strong> (cloche en haut du site) avec le nom de la room et son mode de jeu : un clic et il vous rejoint. Les invitations sont réservées aux amis confirmés.
  </p>

  <h3>Notifications sur votre appareil</h3>
  <p>
    ZIK peut vous prévenir même quand le site est fermé, sur téléphone comme sur ordinateur. Activez-les depuis la cloche ou dans les <a href="/settings#notifications">paramètres</a>, où vous choisissez aussi ce que vous recevez : amis et invitations, cartes, défi de la semaine, rappel du Zikle du jour.
    Sur iPhone et iPad, ajoutez d'abord ZIK à votre écran d'accueil (Partager, puis « Sur l'écran d'accueil ») et ouvrez-le depuis l'icône.
  </p>

  <DocTip label="Classement entre amis :">
    la page <a href="/classements">Classements</a> propose un onglet Amis pour comparer votre ELO uniquement avec vos amis.
  </DocTip>
</section>
