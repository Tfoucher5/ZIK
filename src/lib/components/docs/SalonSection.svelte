<script>
  import DocTable from './DocTable.svelte';
  import { salonSettings, qcmShapes } from './tables.js';
  import DocTip from './DocTip.svelte';
</script>

<section>
  <h2 id="salon">Mode Salon</h2>

  <h3>Qu'est-ce que le Mode Salon ?</h3>
  <p>
    Le Mode Salon est une expérience <strong>Kahoot-like</strong> conçue pour les soirées, les fêtes, les événements d'entreprise ou les salles de classe. L'hôte projette l'écran de contrôle sur une TV ou un vidéoprojecteur, et chaque participant joue sur son <strong>smartphone</strong> via un QR code ou un code à 4 chiffres.
  </p>
  <p>
    Contrairement aux rooms classiques, le Mode Salon est entièrement <strong>orchestré par l'hôte</strong> : c'est lui qui choisit la playlist, configure les paramètres, lance les manches et décide du rythme de la partie.
  </p>

  <h3>Créer un salon</h3>
  <p>Rendez-vous sur <a href="/salon">/salon</a>. Sans compte, vous choisissez parmi les playlists publiques et officielles ; connecté, vous avez aussi accès aux vôtres. Configurez votre salon :</p>
  <ul class="doc-list">
    <li>Choisissez la <strong>playlist</strong> (vos playlists perso ou les officielles)</li>
    <li>Réglez les paramètres (voir tableau ci-dessous)</li>
    <li>Cliquez sur "Créer le salon" → vous êtes redirigé vers l'interface hôte</li>
  </ul>

  <h3>Paramètres du salon</h3>
  <DocTable {...salonSettings} />

  <h3>L'écran hôte (TV / ordi)</h3>
  <p>L'écran hôte (<a href="/salon/host">/salon/host</a>) est optimisé pour être affiché en grand :</p>
  <ul class="doc-list">
    <li><strong>Lobby :</strong> QR code géant + code à 4 chiffres pour rejoindre, liste des joueurs connectés qui se met à jour en temps réel</li>
    <li><strong>Pendant la manche :</strong> Visualizer audio animé, timer géant décomptant en temps réel, titre de la manche (masqué), nombre de joueurs ayant répondu</li>
    <li><strong>Classement joueurs :</strong> Affiché avec des icônes selon le score — 🎤 (top 1), 🎸 (top 2-3), 🎵 (autres) — et mis à jour en direct</li>
    <li><strong>Révélation :</strong> La réponse s'affiche avec animation après la fin de chaque manche</li>
    <li><strong>Podium final :</strong> Top 3 animé à la fin de la partie</li>
    <li><strong>Volume :</strong> Une barre de volume dans l'en-tête permet de régler ou couper le son de la musique sans toucher au player YouTube (réglage conservé entre les sessions)</li>
  </ul>

  <h3>L'interface joueur (téléphone)</h3>
  <p>Les joueurs accèdent à <a href="/salon/play">/salon/play</a> sur leur smartphone :</p>
  <ul class="doc-list">
    <li><strong>Rejoindre :</strong> Scanner le QR code affiché sur l'écran hôte, ou saisir manuellement le code à 4 chiffres</li>
    <li><strong>Timer SVG :</strong> Un cercle SVG décompte le temps restant visuellement, avec changement de couleur progressif (vert → orange → rouge)</li>
    <li><strong>Mode texte libre :</strong> Champ de saisie classique, même moteur de détection que les rooms normales</li>
    <li><strong>Mode QCM :</strong> 4 boutons avec les formes emblématiques — ▲ Triangle, ◆ Losange, ● Cercle, ■ Carré — chacun avec une couleur distincte. Un seul appui suffit pour valider.</li>
    <li><strong>Suspense jusqu'à la fin :</strong> En mode QCM, la bonne réponse et les points gagnés ne sont révélés qu'à la fin du chrono ou quand tout le monde a répondu — personne ne sait si les autres ont bon avant la révélation !</li>
  </ul>

  <h3>QCM — les 4 choix</h3>
  <p>En mode QCM, les 4 options proposées incluent toujours la bonne réponse (artiste + titre) et 3 leurres générés automatiquement depuis d'autres titres de la playlist. <strong>Attention :</strong> parfois, plusieurs titres du même artiste peuvent apparaître dans les choix — il faut donc vraiment reconnaître la chanson et pas seulement l'artiste ! Les formes et couleurs sont fixes :</p>
  <DocTable {...qcmShapes} />

  <h3>Mode buzzer (ZIK Pro)</h3>
  <p>
    Chaque téléphone affiche un gros bouton <strong>Buzz</strong>. Le premier qui appuie coupe la musique, son nom s'affiche en grand sur la TV et il répond <strong>à voix haute</strong>. L'animateur valide depuis la régie (ou l'écran TV) : bonne réponse, le joueur marque des points selon sa rapidité et la manche se termine ; raté, la musique repart et ce joueur ne peut plus buzzer jusqu'à la manche suivante.
  </p>

  <h3>Manches spéciales (ZIK Pro)</h3>
  <p>Une fois activées, environ une manche sur quatre devient spéciale, au hasard (jamais la première, jamais deux de suite). La TV et les téléphones l'annoncent :</p>
  <ul class="doc-list">
    <li><strong>Points doubles :</strong> chaque bonne réponse rapporte deux fois plus</li>
    <li><strong>Intro éclair :</strong> la musique s'arrête au bout de 5 secondes</li>
    <li><strong>Sprint :</strong> deux fois moins de temps pour répondre</li>
  </ul>

  <h3>Toute la soirée dans le même salon</h3>
  <ul class="doc-list">
    <li><strong>Partie suivante :</strong> à la fin d'une partie, la régie ouvre directement les réglages de la suivante (playlist, manches, mode). Les joueurs restent connectés, sans ressaisir de code.</li>
    <li><strong>Classement de la soirée (ZIK Pro) :</strong> les points de chaque partie s'additionnent. La TV l'affiche entre deux parties, chaque téléphone indique sa place.</li>
    <li><strong>Entracte :</strong> depuis la régie, la TV affiche une pause, avec une heure de reprise si vous en choisissez une. Rien ne redémarre tout seul.</li>
    <li><strong>Podium final (ZIK Pro) :</strong> « Terminer la soirée » révèle sur la TV le 3e, le 2e, puis le vainqueur après un roulement de tambour, sous les confettis.</li>
  </ul>

  <h3>Une musique fiable</h3>
  <ul class="doc-list">
    <li><strong>Vérification dès le lobby :</strong> toute la musique de la partie est vérifiée avant le lancement, la TV et la régie affichent ce qui est prêt.</li>
    <li><strong>Extrait audio en secours :</strong> si la vidéo YouTube d'un titre manque, la manche se joue avec son extrait audio de 30 secondes.</li>
    <li><strong>Pause automatique en cas de panne :</strong> si les vidéos ne répondent plus du tout, la partie attend et réessaie toute seule, sans rien perdre.</li>
  </ul>

  <h3>Reconnexion automatique</h3>
  <p>
    Si un joueur perd sa connexion réseau (tunnel, coupure Wi-Fi…), le système lui accorde une <strong>fenêtre de grâce de 90 secondes</strong>. Son score est conservé et il reprend la partie dès qu'il se reconnecte, sans avoir à ressaisir son nom ni rejoindre à nouveau.
  </p>

  <DocTip warn label="Important :">
    Le salon est <strong>éphémère</strong> : il se ferme si plus aucun écran TV ni régie n'est ouvert pendant 10 minutes en pleine partie, ou 2 heures entre deux parties et pendant une pause. Pensez à noter les résultats finaux si vous souhaitez les conserver.
  </DocTip>

  <DocTip label="Astuce soirée :">
    Utilisez le mode QCM avec des manches de 20 secondes pour un rythme dynamique. Activez l'avance automatique avec 5 secondes de révélation pour garder le public en haleine. Projetez l'écran hôte sur un grand écran et laissez chaque joueur utiliser son propre smartphone.
  </DocTip>
</section>
