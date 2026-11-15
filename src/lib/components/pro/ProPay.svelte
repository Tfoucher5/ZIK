<script>
  import { PRIX_SOIREE } from './proContent.js';

  const ITEMS = [
    {
      titre: 'Paiement sécurisé par Stripe',
      texte: 'Vous payez sur la page de Stripe, ZIK ne voit jamais votre carte.',
      icon: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
      key: true,
    },
    {
      titre: 'Facture par e-mail',
      texte: "À chaque paiement, envoyée par Stripe. Ajoutez le nom de votre établissement, son adresse et votre numéro de TVA.",
      icon: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h6"/>',
    },
    {
      titre: 'Résiliation en un clic',
      texte: "Depuis cette page, bouton « Gérer mon abonnement ». ZIK Pro reste actif jusqu'à la fin de la période payée, sans autre prélèvement.",
      icon: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    },
    {
      titre: 'La Soirée ne se renouvelle pas',
      texte: `${PRIX_SOIREE} une fois, 24 h de ZIK Pro, et c'est tout.`,
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    },
  ];
</script>

<section id="paiement" class="calm" aria-labelledby="pro-pay">
  <div class="wrap in">
    <div class="head rv">
      <span class="label"><i></i>Paiement</span>
      <h2 class="grad" id="pro-pay">Payer, recevoir la facture, arrêter</h2>
      <p>Créez un compte ZIK, choisissez une formule, payez sur la page de Stripe. ZIK Pro s'active sur votre compte dès que Stripe confirme le paiement.</p>
    </div>
    <div class="kit">
      {#each ITEMS as it (it.titre)}
        <div class="item rv" class:key={it.key}>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -- icônes constantes du fichier -->
          <svg viewBox="0 0 24 24" aria-hidden="true">{@html it.icon}</svg>
          <div>
            <h3>{it.titre}</h3>
            <p>{it.texte}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .in .head {
    margin-bottom: 28px;
  }
  .kit {
    display: grid;
    gap: 14px;
  }
  .item {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 14px;
    align-items: start;
    padding: 18px;
    border-radius: 18px;
    background: rgba(15, 15, 23, 0.6);
    border: 1px solid var(--line);
  }
  .item.key {
    border-color: rgba(47, 184, 255, 0.45);
    background: linear-gradient(135deg, rgba(47, 184, 255, 0.12), rgba(15, 15, 23, 0.6));
  }
  svg {
    width: 44px;
    height: 44px;
    padding: 9px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    stroke: var(--text);
    fill: none;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .key svg {
    stroke: var(--bleu);
  }
  h3 {
    font-weight: 800;
    font-size: 1.35rem;
  }
  .item p {
    margin-top: 4px;
    color: var(--muted);
    font-size: 15px;
  }
  @media (min-width: 900px) {
    .in {
      display: grid;
      grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
      gap: 64px;
      align-items: start;
    }
    .in .head {
      margin-bottom: 0;
    }
  }
</style>
