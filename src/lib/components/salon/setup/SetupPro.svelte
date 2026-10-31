<script>
  import { FREE_MAX_PLAYERS, FREE_MAX_TEAMS } from '$lib/data/proPlans.js';

  let { pro, proRow, portalBusy, onPortal } = $props();
</script>

<aside class="st-tv">
  <span class="st-tv-ic" aria-hidden="true">▶</span>
  <p>
    En ouvrant le salon, <b>cet onglet devient l'écran TV</b> : branche cet ordinateur à la télé.
    Le pilotage se fait depuis la <b>régie</b>, sur un autre écran — ordinateur, tablette ou téléphone.
  </p>
</aside>

{#if pro}
  <p class="st-pro-actif">
    <b>ZIK Pro actif</b> : joueurs et équipes illimités, classement de la soirée, régie complète.
    {#if proRow.stripe_customer_id}
      <button type="button" class="st-pro-manage" disabled={portalBusy} onclick={onPortal}>
        {portalBusy ? 'Ouverture…' : proRow.plan === 'night' ? 'Mes factures' : 'Gérer mon abonnement'}
      </button>
    {/if}
  </p>
{:else}
  <aside class="st-pro-bloc">
    <div class="st-pro-txt">
      <span class="st-pro-lbl">ZIK Pro</span>
      <h3>Pour les bars, les campings et les événements</h3>
      <ul>
        <li>Joueurs illimités, au lieu de {FREE_MAX_PLAYERS}</li>
        <li>Autant d'équipes que voulu, au lieu de {FREE_MAX_TEAMS}</li>
        <li>Le classement de la soirée, cumulé partie après partie</li>
        <li>Régie complète : révéler, couper, ajuster les scores</li>
      </ul>
    </div>
    <a class="st-pro-cta" href="/pro#tarifs">Découvrir ZIK Pro</a>
  </aside>
{/if}

<style>
  /* L'avertissement « cet onglet devient l'écran TV » est ce que les gens
     ratent le plus : il quitte le corps de texte gris pour un encadré. */
  .st-tv {
    display: flex; align-items: flex-start; gap: 14px;
    margin-top: 32px; padding: 16px 18px;
    border: 1px solid var(--border2); border-left: 3px solid var(--accent);
    border-radius: 3px; background: var(--surface);
  }
  .st-tv-ic {
    flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgb(var(--accent-rgb) / 0.14); color: var(--accent); font-size: 0.7rem;
  }
  .st-tv p { margin: 0; font-size: 0.9rem; line-height: 1.6; color: var(--mid); }
  .st-tv b { color: var(--text); }

  .st-pro-actif { margin-top: 20px; font-size: 0.88rem; color: var(--mid); }
  .st-pro-actif b { color: var(--text); }

  /* L'offre vendue n'était qu'une ligne de texte gris en bas de page. */
  .st-pro-bloc {
    display: flex; align-items: center; justify-content: space-between;
    gap: 28px; flex-wrap: wrap;
    margin-top: 20px; padding: 24px 26px;
    border: 1px solid rgb(var(--accent-rgb) / 0.35);
    border-radius: 4px;
    background: rgb(var(--accent-rgb) / 0.05);
  }
  .st-pro-txt { min-width: 0; }
  .st-pro-lbl {
    display: inline-block;
    font-family: "Barlow Condensed", sans-serif; font-weight: 900;
    font-size: 0.68rem; letter-spacing: 0.24em; text-transform: uppercase;
    color: var(--accent); margin-bottom: 8px;
  }
  .st-pro-bloc h3 {
    margin: 0 0 12px; font-size: 1.15rem; line-height: 1.3;
    font-family: "Barlow Condensed", sans-serif; font-weight: 800;
  }
  .st-pro-bloc ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .st-pro-bloc li { font-size: 0.88rem; color: var(--mid); padding-left: 18px; position: relative; }
  .st-pro-bloc li::before { content: '→'; position: absolute; left: 0; color: var(--accent); }
  .st-pro-cta {
    flex-shrink: 0;
    padding: 13px 26px; border-radius: 99px;
    background: var(--accent); color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif; font-weight: 900;
    font-size: 0.92rem; letter-spacing: 0.1em; text-transform: uppercase;
    text-decoration: none; white-space: nowrap;
  }
  .st-pro-cta:hover { filter: brightness(1.08); }

  @media (max-width: 640px) {
    .st-pro-bloc { padding: 20px 18px; }
    .st-pro-cta { width: 100%; text-align: center; }
  }
  .st-pro-manage { margin-left: 6px; padding: 0; background: none; border: none; font: inherit; color: var(--accent); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
</style>
