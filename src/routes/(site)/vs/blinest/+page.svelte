<script>
  import VsPage from '$lib/components/vs/VsPage.svelte';
</script>

<VsPage
  slug="blinest"
  name="Blinest"
  title="ZIK vs Blinest - Comparaison des blind tests musicaux en ligne"
  description="ZIK ou Blinest pour votre prochain blind test musical ? Comparaison factuelle : playlists Deezer personnalisées sur ZIK, classement ELO compétitif, Mode Salon pour les soirées."
  ogTitle="ZIK vs Blinest - Comparaison blind test musical"
  ogDescription="ZIK et Blinest sont deux blind tests musicaux en ligne. ZIK permet d'importer ses propres playlists Deezer et propose un Mode Salon pour les soirées."
  ldName="ZIK vs Blinest — Comparaison des blind tests musicaux en ligne"
  ldDescription="ZIK et Blinest sont deux blind tests musicaux en ligne. Comparaison factuelle : playlists personnalisées, modes de jeu, classement ELO, Mode Salon."
  h1="ZIK vs Blinest : deux blind tests musicaux, des approches différentes"
  intro="ZIK et Blinest sont deux blind tests musicaux en ligne gratuits, tous deux francophones. Cette comparaison présente leurs différences de façon factuelle, pour vous aider à choisir selon votre usage."
  sections={[
    { title: 'Ce que fait ZIK', blocks: [
      { p: 'ZIK est un blind test musical multijoueur en temps réel. Il se distingue par :' },
      { ul: [
        "L'import de playlists personnalisées depuis Deezer",
        'Trois modes de jeu : Classique (ELO), QCM (casual), Salon (soirée TV + smartphones)',
        'Un classement ELO compétitif persistant pour les joueurs inscrits',
        'La création de rooms publiques et privées avec code partageable',
        "Jusqu'à 20 joueurs simultanément, en temps réel via Socket.io",
      ] },
    ] },
    { title: 'Ce que fait Blinest', blocks: [
      { p: 'Blinest est un blind test musical en ligne basé sur des extraits de playlists Deezer. Le joueur écoute un extrait et doit identifier le titre parmi des propositions. Blinest propose différents genres musicaux (pop, rock, rap, etc.) sous forme de défis.' },
      { p: "Blinest ne permet pas d'importer ses propres playlists personnalisées, ni d'organiser des parties multijoueur en temps réel avec ses amis depuis une room dédiée." },
    ] },
    { title: 'Comparaison rapide', rows: [
      ['Import playlists Deezer', true, false],
      ['Multijoueur en temps réel', true, false],
      ['Classement ELO compétitif', true, false],
      ['Mode Salon (TV + smartphones)', true, false],
      ['Mode QCM', true, true],
      ['Blind test solo / défis par genre', 'Partiel', true],
      ['Rooms privées avec code', true, false],
      ['Sans inscription obligatoire', true, true],
      ['Jeu en ligne gratuit', true, true],
    ] },
    { title: 'Quand choisir ZIK plutôt que Blinest ?', blocks: [
      { ul: [
        'Vous voulez jouer avec vos propres playlists Deezer',
        'Vous cherchez un blind test multijoueur en temps réel avec des amis',
        'Vous organisez une soirée et voulez un Mode Salon TV + smartphones',
        'Vous voulez un classement ELO compétitif et persistant',
      ] },
    ] },
    { title: 'Quand choisir Blinest ?', blocks: [
      { ul: [
        'Vous préférez jouer en solo sur des défis par genre musical prédéfinis',
        "Vous n'avez pas de playlist particulière en tête et voulez jouer directement",
      ] },
    ] },
  ]}
  cta={{ text: 'Importez vos playlists et jouez avec vos amis sur ZIK. Gratuit, sans inscription.', label: 'Essayer ZIK →' }}
/>
