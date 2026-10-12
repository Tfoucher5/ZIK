<script>
  import DocTable from './DocTable.svelte';
  import { guestVsAccount } from './tables.js';
  import DocTip from './DocTip.svelte';
</script>

<section>
  <h2 id="rejoindre">Rejoindre une partie</h2>

  <h3>Rooms officielles</h3>
  <p>
    Les <strong>rooms officielles</strong> sont des salles permanentes gérées par l'équipe ZIK. Elles sont toujours disponibles, avec des playlists mises à jour régulièrement. Pour y accéder, rendez-vous sur la page <a href="/rooms">Rooms</a> et cliquez sur la room de votre choix. La partie commence automatiquement dès que vous rejoignez.
  </p>

  <h3>Rejoindre par code</h3>
  <p>
    Si un ami vous partage un <strong>code de room</strong> (format : 6 caractères alphanumériques), saisissez-le dans le champ "Rejoindre par code" sur la page Rooms. Les rooms custom créées par les joueurs sont accessibles de cette façon.
  </p>

  <h3>Mode invité vs compte</h3>
  <DocTable {...guestVsAccount} />

  <DocTip label="Mode invité :">
    Votre pseudo est demandé à la première connexion et stocké localement dans votre navigateur. Vos scores de session s'affichent en temps réel mais ne sont pas sauvegardés. Créez un compte gratuit pour ne rien perdre.
  </DocTip>

  <h3>Rejoindre le Mode Salon</h3>
  <p>
    Pour rejoindre un salon, scannez le QR code affiché sur l'écran hôte (TV ou vidéoprojecteur) ou saisissez le code à 4 chiffres manuellement sur la page <a href="/salon/play">/salon/play</a>. Aucun compte n'est nécessaire pour jouer en tant que participant.
  </p>
</section>
