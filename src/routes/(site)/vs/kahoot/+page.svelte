<script>
  import VsPage from '$lib/components/vs/VsPage.svelte';
</script>

<VsPage
  slug="kahoot"
  name="Kahoot"
  title="ZIK vs Kahoot - Quel est le meilleur blind test multijoueur ?"
  description="ZIK ou Kahoot pour votre prochain blind test musical ? Comparaison factuelle : spécialisation musicale, import Deezer, classement ELO, Mode Salon. ZIK est conçu exclusivement pour le blind test."
  ogTitle="ZIK vs Kahoot - Comparaison blind test multijoueur"
  ogDescription="ZIK est spécialisé dans le blind test musical avec import Deezer et classement ELO. Kahoot est une plateforme de quiz généraliste. Comparaison factuelle."
  ldName="ZIK vs Kahoot — Comparaison des blind tests en ligne"
  ldDescription="ZIK et Kahoot sont deux plateformes de quiz multijoueur. ZIK est spécialisé dans le blind test musical avec import Deezer. Comparaison factuelle."
  h1="ZIK vs Kahoot : quel outil choisir pour un blind test musical ?"
  intro="ZIK et Kahoot sont deux plateformes de quiz multijoueur en ligne. Leur point commun s'arrête là. ZIK est entièrement dédié au blind test musical. Kahoot est une plateforme de quiz généraliste, populaire dans les contextes éducatifs et professionnels. Cette comparaison est factuelle et basée sur les fonctionnalités documentées des deux plateformes."
  sections={[
    { title: 'Ce que fait ZIK', blocks: [
      { p: "ZIK est un jeu de blind test musical multijoueur gratuit. Les joueurs écoutent des extraits musicaux et doivent identifier le titre et l'artiste. ZIK propose trois modes :" },
      { ul: [
        ['Mode Classique', ' — saisie libre, classement ELO compétitif'],
        ['Mode QCM', ' — 4 propositions à choix multiple, accessible à tous'],
        ['Mode Salon', ' — hôte sur grand écran, joueurs sur smartphone'],
      ] },
      { p: "ZIK permet l'import direct de playlists depuis Deezer. Il est gratuit, sans abonnement, et ne nécessite pas de compte pour jouer." },
    ] },
    { title: 'Ce que fait Kahoot', blocks: [
      { p: "Kahoot est une plateforme de quiz interactif principalement utilisée en contexte éducatif et professionnel. Elle permet de créer des questionnaires avec texte, images et vidéos, accessibles depuis un navigateur ou l'application mobile." },
      { p: "Kahoot est généraliste : il ne propose pas de fonctionnalités dédiées au blind test musical. Créer un blind test sur Kahoot nécessite d'intégrer manuellement chaque extrait audio et de construire les questions à la main, sans import automatique de playlists." },
    ] },
    { title: 'Comparaison rapide', rows: [
      ['Spécialisé blind test musical', true, false],
      ['Import Deezer', true, false],
      ['Classement ELO compétitif', true, false],
      ['Mode Salon (TV + smartphones)', true, 'Partiel'],
      ['Mode QCM multijoueur', true, true],
      ['Sans inscription obligatoire', true, false],
      ['Version gratuite', true, true],
      ['Quiz non-musicaux', false, true],
    ] },
    { title: 'Quand choisir ZIK plutôt que Kahoot ?', blocks: [
      { ul: [
        'Vous organisez une soirée blind test musical entre amis',
        'Vous voulez utiliser vos propres playlists Deezer',
        'Vous cherchez un classement compétitif avec système ELO',
        'Vous voulez jouer sans créer de compte',
        'Vous voulez un accès gratuit, et une offre Pro abordable pour les bars et les événements',
      ] },
    ] },
    { title: 'Quand choisir Kahoot ?', blocks: [
      { ul: [
        'Vous souhaitez créer des quiz sur des sujets non-musicaux (histoire, sciences, etc.)',
        'Vous travaillez dans un contexte éducatif ou professionnel',
        "Vous avez besoin de fonctionnalités avancées de gestion de classes ou d'équipes",
      ] },
    ] },
  ]}
  cta={{ text: 'ZIK est fait pour le blind test musical. Essayez-le gratuitement.', label: 'Jouer sur ZIK →' }}
/>
