<script>
  import DocTip from './DocTip.svelte';
</script>

<section>
  <h2 id="rooms">Rooms</h2>

  <h3>Rooms officielles permanentes</h3>
  <p>
    Les rooms officielles sont des salles toujours ouvertes, accessibles 24h/24. Elles utilisent les playlists officielles ZIK et sont configurées avec des paramètres optimaux (durée de manche, difficulté). N'importe qui peut les rejoindre à tout moment — si personne ne joue, vous êtes seul jusqu'à ce qu'un autre joueur arrive.
  </p>

  <h3>Rooms custom éphémères</h3>
  <p>
    Vous pouvez créer votre propre room avec votre playlist et vos paramètres (compte requis). Les rooms custom sont <strong>éphémères</strong> : elles existent en mémoire sur le serveur et disparaissent automatiquement après <strong>4 heures d'inactivité</strong>. Le code de la room est à partager avec vos amis.
  </p>

  <h3>Rejoindre par code</h3>
  <p>
    Sur la page <a href="/rooms">Rooms</a>, un champ "Rejoindre par code" vous permet de saisir directement le code à 6 caractères d'une room custom. Utile quand votre ami vous envoie le code par message.
  </p>

  <h3>Créer sa propre room</h3>
  <ol class="doc-list">
    <li>Allez sur <a href="/rooms">Rooms</a> → "Créer une room"</li>
    <li>Choisissez une playlist (vos playlists ou les officielles)</li>
    <li>Configurez la durée des manches et les options</li>
    <li>Partagez le code généré avec vos amis</li>
  </ol>

  <DocTip label="Room vs Salon :">
    Les rooms sont idéales pour jouer en continu avec des amis en ligne. Le Mode Salon est préférable pour les événements en présentiel avec une TV ou un vidéoprojecteur.
  </DocTip>
</section>
