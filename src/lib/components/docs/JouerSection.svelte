<script>
  import DocTip from './DocTip.svelte';
</script>

<section>
  <h2 id="jouer">Comment jouer</h2>

  <h3>Le principe</h3>
  <p>
    À chaque manche, un extrait musical est diffusé. Votre objectif est de trouver <strong>l'artiste principal</strong> et le <strong>titre de la chanson</strong> le plus vite possible. Si la chanson comporte des artistes en featuring, chaque feat trouvé rapporte un point supplémentaire.
  </p>

  <h3>La saisie libre</h3>
  <p>
    Les réponses se font via un champ texte libre. Vous pouvez taper l'artiste et le titre dans n'importe quel ordre. Le système analyse votre saisie en continu et valide automatiquement les bonnes réponses au fur et à mesure que vous tapez.
  </p>
  <p>
    Il n'est pas nécessaire d'appuyer sur Entrée : la détection est <strong>instantanée</strong>, lettre par lettre.
  </p>

  <h3>Le système de détection</h3>
  <p>ZIK utilise un moteur de reconnaissance textuelle avancé qui gère :</p>
  <ul class="doc-list">
    <li><strong>Casse ignorée :</strong> "beyonce", "BEYONCÉ" et "Beyoncé" sont tous acceptés.</li>
    <li><strong>Accents ignorés :</strong> Pas besoin de taper les accents — "beyonce" = "Beyoncé", "daft punk" reste "Daft Punk".</li>
    <li><strong>Fautes de frappe tolérées :</strong> Le moteur utilise une distance de Levenshtein et une analyse phonétique pour accepter les approximations. "Coldplay" peut être validé si vous tapez "Coldplya" par erreur.</li>
    <li><strong>Correspondance partielle :</strong> Si votre saisie représente au moins 40% du mot attendu ET que la réponse contient ce que vous avez tapé, c'est validé. Pratique pour les titres longs.</li>
    <li><strong>Saisie courte (1-2 caractères) :</strong> La correspondance exacte est requise pour éviter les faux positifs.</li>
    <li><strong>Feats et collaborations :</strong> Tapez le nom d'un artiste en featuring pour valider ce feat séparément.</li>
  </ul>

  <h3>Messages de chauffe</h3>
  <p>
    Si votre saisie est très proche de la bonne réponse sans l'atteindre encore, le jeu affiche un message <em>"Tu chauffes !"</em> pour vous encourager. Continuez à compléter votre réponse !
  </p>

  <h3>Temps de réponse</h3>
  <p>
    Chaque manche a une durée fixée (30 secondes par défaut dans les rooms officielles, configurable en Mode Salon). Le timer s'affiche visuellement. Quand le temps est écoulé, la réponse correcte est révélée et la manche suivante démarre.
  </p>

  <DocTip warn label="Attention :">
    Une fois la bonne réponse trouvée par vous-même, les points sont fixés. Si vous l'avez trouvé en premier, vous recevez aussi le bonus "premier à trouver". Mais si un autre joueur trouve avant vous, vous pouvez encore marquer des points en trouvant après — le bonus vitesse sera juste moins élevé.
  </DocTip>
</section>
