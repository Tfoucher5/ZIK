<script>
  import VsPage from '$lib/components/vs/VsPage.svelte';
</script>

<VsPage
  slug="blindtest-io"
  name="Blindtest.io"
  title="ZIK vs Blindtest.io - Comparaison des blind tests musicaux en ligne"
  description="ZIK ou Blindtest.io ? Comparaison factuelle : ZIK propose l'import Deezer, un classement ELO compétitif et un Mode Salon pour les soirées. Gratuit, sans inscription."
  ogTitle="ZIK vs Blindtest.io - Comparaison blind test en ligne"
  ogDescription="ZIK et Blindtest.io sont deux blind tests musicaux en ligne. ZIK permet l'import de playlists Deezer et propose un Mode Salon pour les soirées."
  ldName="ZIK vs Blindtest.io — Comparaison des blind tests en ligne"
  ldDescription="ZIK et Blindtest.io sont deux blind tests musicaux en ligne. Comparaison factuelle : playlists personnalisées, modes de jeu, classement ELO, Mode Salon."
  h1="ZIK vs Blindtest.io : quel blind test en ligne choisir ?"
  intro="ZIK et Blindtest.io sont deux plateformes de blind test musical en ligne. Cette comparaison présente leurs différences de façon factuelle pour vous aider à choisir selon votre usage."
  sections={[
    { title: 'Ce que fait ZIK', blocks: [
      { p: 'ZIK est un blind test musical multijoueur en temps réel avec trois modes de jeu :' },
      { ul: [
        ['Mode Classique', " — saisie libre du titre et de l'artiste, classement ELO compétitif"],
        ['Mode QCM', ' — 4 propositions à choix multiple, sans pression'],
        ['Mode Salon', ' — hôte sur grand écran, joueurs sur smartphone (QR code / code)'],
      ] },
      { p: "ZIK permet d'importer des playlists depuis Deezer, ou de créer des playlists manuellement. Rooms publiques, privées et rooms officielles thématiques disponibles." },
    ] },
    { title: 'Ce que fait Blindtest.io', blocks: [
      { p: 'Blindtest.io est un blind test musical en ligne permettant de jouer à partir d\'extraits musicaux. La plateforme propose des thèmes et catégories musicales prédéfinis.' },
      { p: 'Cette comparaison est basée sur les informations publiquement disponibles. Si des fonctionnalités ont évolué, ZIK ne saurait en être tenu responsable.' },
    ] },
    { title: 'Comparaison rapide', rows: [
      ['Import playlists Deezer', true, false],
      ['Multijoueur en temps réel', true, true],
      ['Classement ELO compétitif', true, false],
      ['Mode Salon (TV + smartphones)', true, false],
      ['Mode QCM', true, true],
      ['Rooms privées avec code', true, true],
      ['Sans inscription obligatoire', true, 'Variable'],
      ['Jeu en ligne gratuit', true, 'Variable'],
    ] },
    { title: 'Quand choisir ZIK ?', blocks: [
      { ul: [
        'Vous voulez utiliser vos propres playlists Deezer',
        'Vous cherchez un classement ELO compétitif persistant',
        'Vous organisez une soirée et voulez un Mode Salon (TV + smartphones)',
        'Vous voulez une expérience multijoueur en temps réel, gratuite et sans inscription',
      ] },
    ] },
  ]}
  cta={{ text: 'ZIK est conçu pour le blind test musical multijoueur. Essayez-le gratuitement.', label: 'Jouer sur ZIK →' }}
/>
