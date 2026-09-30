<script>
  import { PLANS } from '$lib/proPlans.js';

  // Identité du vendeur, reprise dans les mentions légales
  const SELLER = {
    name: 'Théo Foucher',
    status: 'Entrepreneur individuel',
    address: 'À COMPLÉTER',
    siret: 'À COMPLÉTER',
    email: 'theo@zik-music.fr',
  };
</script>

<svelte:head>
  <title>ZIK - Conditions Générales de Vente</title>
  <meta name="description" content="Conditions Générales de Vente de ZIK Pro : formules Soirée, Mensuel et Annuel du Mode Salon, paiement, résiliation, rétractation et responsabilités.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://www.zik-music.fr/cgv">
</svelte:head>

<main class="legal-page">
  <button onclick={() => history.back()} class="legal-back">&larr; Retour</button>
  <h1>Conditions Générales de Vente</h1>
  <p class="legal-date">Dernière mise à jour : octobre 2026</p>

  <section>
    <h2>1. Objet</h2>
    <p>Les présentes conditions générales de vente (CGV) encadrent la vente de <strong>ZIK Pro</strong>, l'offre payante du Mode Salon de ZIK, accessible sur <strong>www.zik-music.fr</strong>. Elles s'appliquent à toute commande passée par un professionnel (bar, restaurant, camping, entreprise, association) comme par un particulier. L'utilisation générale du site reste régie par les <a href="/cgu">Conditions Générales d'Utilisation</a>.</p>
    <p>Toute commande vaut acceptation pleine et entière des présentes CGV, dans leur version en ligne au jour de la commande.</p>
  </section>

  <section>
    <h2>2. Vendeur</h2>
    <ul>
      <li><strong>Nom :</strong> {SELLER.name}</li>
      <li><strong>Statut :</strong> {SELLER.status}</li>
      <li><strong>Adresse :</strong> {SELLER.address}</li>
      <li><strong>SIRET :</strong> {SELLER.siret}</li>
      <li><strong>Contact :</strong> <a href="mailto:{SELLER.email}">{SELLER.email}</a></li>
    </ul>
  </section>

  <section>
    <h2>3. Le service ZIK Pro</h2>
    <p>ZIK Pro débloque, pour le compte ZIK qui l'achète, des fonctions supplémentaires du Mode Salon : joueurs illimités, jusqu'à 8 équipes, régie complète sur un second écran (révéler la réponse, terminer une partie, corriger les points, régler le volume de la TV, modifier les réglages en pleine partie). La liste à jour figure sur la page <a href="/pro">ZIK Pro</a>.</p>
    <p>Le service est fourni en ligne, depuis un navigateur. Il ne comprend ni matériel, ni installation, ni animation sur place.</p>
    <p>ZIK peut faire évoluer le service, notamment en ajoutant des fonctions. Les fonctions annoncées comme « bientôt » ne font pas partie de ce qui est vendu tant qu'elles ne sont pas disponibles.</p>
  </section>

  <section>
    <h2>4. Formules et prix</h2>
    <ul>
      {#each PLANS as p (p.id)}
        <li><strong>{p.name} :</strong> {p.price} {p.period}</li>
      {/each}
    </ul>
    <p>Les prix sont indiqués en euros, <strong>TVA non applicable, article 293 B du Code général des impôts</strong>. Ils peuvent être modifiés à tout moment. Le prix applicable est celui affiché au moment de la commande. Pour un abonnement en cours, tout changement de prix est annoncé par e-mail au moins 30 jours à l'avance et ne s'applique qu'à partir de l'échéance suivante. Le client peut résilier avant cette échéance s'il refuse le nouveau prix.</p>
  </section>

  <section>
    <h2>5. Commande</h2>
    <p>La commande se fait depuis la page <a href="/pro#tarifs">ZIK Pro</a>, avec un compte ZIK (gratuit). ZIK Pro est rattaché à ce compte : les options Pro s'appliquent aux salons ouverts en étant connecté avec lui.</p>
    <p>Le client choisit une formule, puis il est dirigé vers la page de paiement sécurisée de Stripe. La commande est ferme dès la confirmation du paiement. Un e-mail de confirmation, un reçu et une facture sont ensuite envoyés à l'adresse donnée lors du paiement.</p>
  </section>

  <section>
    <h2>6. Paiement</h2>
    <p>Le paiement est traité par <strong>Stripe Payments Europe Ltd</strong>, prestataire de paiement agréé. Les moyens acceptés sont ceux proposés sur la page de paiement (carte bancaire, Apple Pay, Google Pay…). ZIK n'a jamais accès aux numéros de carte.</p>
    <ul>
      <li><strong>Soirée :</strong> paiement unique, sans renouvellement.</li>
      <li><strong>Mensuel et Annuel :</strong> paiement au début de chaque période, puis renouvellement automatique pour une période identique, jusqu'à résiliation.</li>
    </ul>
    <p>En cas d'échec d'un prélèvement, Stripe relance automatiquement le paiement. Si le paiement reste impossible, l'accès à ZIK Pro est suspendu jusqu'à régularisation. Le compte ZIK et la version gratuite du Mode Salon restent utilisables.</p>
  </section>

  <section>
    <h2>7. Durée, résiliation</h2>
    <p>Le passe <strong>Soirée</strong> donne accès à ZIK Pro pendant 24 heures à compter du paiement. Un nouveau passe acheté avant la fin du précédent s'ajoute à sa suite.</p>
    <p>Les abonnements <strong>Mensuel</strong> et <strong>Annuel</strong> sont sans engagement au-delà de la période en cours. Le client les résilie à tout moment, en un clic, depuis la page ZIK Pro (bouton « Gérer mon abonnement »), ou par simple e-mail. La résiliation prend effet à la fin de la période déjà payée : ZIK Pro reste actif jusque-là et aucun autre paiement n'est prélevé. Une période commencée n'est pas remboursée, sauf dans les cas prévus aux articles 8 et 9.</p>
    <p>ZIK peut suspendre ou résilier l'accès à ZIK Pro en cas de manquement grave aux présentes CGV ou aux CGU (fraude, abus, contournement des limites), après avertissement par e-mail sauf urgence.</p>
  </section>

  <section>
    <h2>8. Droit de rétractation (particuliers)</h2>
    <p>Le client qui achète en tant que consommateur dispose en principe d'un délai de 14 jours pour se rétracter. ZIK Pro étant un service numérique activé immédiatement, le client demande expressément, en validant son paiement, que le service commence tout de suite, et reconnaît qu'il perd son droit de rétractation une fois le service pleinement exécuté (articles L221-25 et L221-28 du Code de la consommation).</p>
    <p>Concrètement : un passe Soirée entièrement consommé n'est pas remboursable. Pour un abonnement, le consommateur qui se rétracte dans les 14 jours par e-mail à <a href="mailto:{SELLER.email}">{SELLER.email}</a> est remboursé au prorata de la période non utilisée.</p>
    <p>Ce droit ne s'applique pas aux achats faits par un professionnel pour les besoins de son activité.</p>
  </section>

  <section>
    <h2>9. Disponibilité et incidents</h2>
    <p>ZIK fait son possible pour que le service fonctionne en continu, sans pouvoir le garantir : maintenance, panne d'un hébergeur, indisponibilité de YouTube, de Deezer ou de la connexion internet du lieu peuvent l'interrompre. Si ZIK Pro devient inutilisable plus de 24 heures d'affilée du fait de ZIK, le client peut demander par e-mail une prolongation gratuite équivalente, ou le remboursement de la période concernée.</p>
    <p>La qualité de l'expérience dépend aussi du matériel et de la connexion du client (écran, son, réseau), qui restent sous sa responsabilité.</p>
  </section>

  <section>
    <h2>10. Musique et diffusion publique</h2>
    <p>ZIK diffuse de courts extraits musicaux via des services tiers (YouTube, Deezer). ZIK Pro ne comprend <strong>aucune licence de diffusion publique de musique</strong>. Un établissement qui diffuse de la musique au public (bar, restaurant, camping, événement) reste seul responsable des autorisations et redevances nécessaires, notamment auprès de la <strong>SACEM</strong>, comme pour toute musique diffusée dans ses locaux.</p>
  </section>

  <section>
    <h2>11. Responsabilité</h2>
    <p>ZIK est tenu d'une obligation de moyens. Sa responsabilité ne peut être engagée qu'en cas de faute prouvée, et, vis-à-vis d'un professionnel, elle est limitée au montant payé par le client au cours des 12 derniers mois. ZIK n'est pas responsable des dommages indirects (perte de chiffre d'affaires, soirée annulée…), ni des contenus saisis par les joueurs (pseudos, noms d'équipes), que l'hôte peut modérer depuis la régie.</p>
    <p>Rien dans ces CGV ne limite les droits dont bénéficie un consommateur en vertu de la loi.</p>
  </section>

  <section>
    <h2>12. Données personnelles</h2>
    <p>Les données nécessaires à la commande (compte ZIK, e-mail, informations de facturation) sont traitées pour exécuter le contrat et respecter les obligations comptables. Les données de paiement sont traitées par Stripe. Le détail figure dans la <a href="/confidentialite">Politique de confidentialité</a>.</p>
  </section>

  <section>
    <h2>13. Réclamations et litiges</h2>
    <p>Toute réclamation se fait par e-mail à <a href="mailto:{SELLER.email}">{SELLER.email}</a> : une réponse est apportée sous 7 jours.</p>
    <p>Le consommateur peut aussi recourir gratuitement à un médiateur de la consommation (médiateur désigné : À COMPLÉTER), ou à la plateforme européenne de règlement en ligne des litiges.</p>
    <p>Les présentes CGV sont soumises au droit français. À défaut d'accord amiable, le litige est porté devant les tribunaux compétents. Entre professionnels, compétence est attribuée aux tribunaux du ressort du domicile du vendeur.</p>
  </section>
</main>

<style>
.legal-page {
  max-width: 720px;
  margin: 0 auto;
  padding: calc(var(--nav-h) + 32px) 24px 80px;
}
.legal-back {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-bottom: 24px;
  font-size: 0.82rem;
  color: var(--mid);
  font-weight: 500;
}
.legal-page h1 {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 6px;
}
.legal-date { font-size: 0.8rem; color: var(--dim); margin-bottom: 40px; }
.legal-page section { margin-bottom: 32px; }
.legal-page h2 {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--text);
}
.legal-page p, .legal-page li { font-size: 0.9rem; color: var(--mid); line-height: 1.7; }
.legal-page p { margin-bottom: 8px; }
.legal-page ul { padding-left: 20px; margin: 8px 0; }
.legal-page li { margin-bottom: 4px; }
.legal-page a { color: var(--accent); }
</style>
