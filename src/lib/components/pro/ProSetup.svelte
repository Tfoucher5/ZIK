<script>
  import ProSection from './ProSection.svelte';
  import { BESOINS } from './proContent.js';
  import { FREE_MAX_PLAYERS } from '$lib/data/proPlans.js';
</script>

<ProSection title="Ce qu'il vous faut">
  <ul>
    {#each BESOINS as b (b)}<li>{b}</li>{/each}
  </ul>
  <p>
    Jusqu'à {FREE_MAX_PLAYERS} joueurs en version gratuite, sans limite avec ZIK Pro. Si quelqu'un perd sa
    connexion en cours de route, il retrouve sa place et son score en
    rejoignant à nouveau.
  </p>
</ProSection>

<ProSection title="Le choix de la musique">
  <p>
    Vous pouvez partir des <a href="/blind-test">thèmes déjà prêts</a>
    (années 80, rap français, Disney, génériques de séries...) ou construire votre propre playlist en
    important directement depuis Deezer. De quoi coller à votre
    public plutôt qu'à une sélection générique.
  </p>
  <p>
    Deux formats au choix : le Mode Classique, où l'on tape le titre et
    l'artiste, et le Mode QCM avec quatre propositions, plus accessible
    quand les niveaux sont très différents ou quand il y a du monde.
  </p>
</ProSection>
