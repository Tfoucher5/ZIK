<script>
  import { PLAN_LABELS } from '$lib/shared/admin/players.js';
  import { date } from './userAdmin.js';

  /** Colonne latérale : accès ZIK Pro et gestion du compte. */
  let { p, data, proActive, proDaysLeft, onOpen } = $props();
</script>

<aside class="side">
  <section class="a-section pro" class:on={proActive}>
    <div class="a-section-head"><h3>ZIK Pro</h3>{#if proActive}<em class="a-tag accent">Actif</em>{:else}<em class="a-tag">Gratuit</em>{/if}</div>
    {#if proActive}
      <p class="big-line"><span class="a-big">{proDaysLeft}</span> jour{proDaysLeft > 1 ? 's' : ''} restant{proDaysLeft > 1 ? 's' : ''}</p>
      <p class="a-muted">{PLAN_LABELS[data.pro.plan] ?? data.pro.plan} · jusqu'au {date(data.pro.current_period_end)}</p>
      {#if data.pro.stripe_subscription_id}<p class="note">Abonnement payé par carte : un cadeau le remplace par un accès offert.</p>{/if}
    {:else if data.pro}
      <p class="a-muted">Ancien accès {PLAN_LABELS[data.pro.plan] ?? data.pro.plan}, terminé le {date(data.pro.current_period_end)}.</p>
    {:else}
      <p class="a-muted">Ce joueur n'a jamais eu ZIK Pro.</p>
    {/if}
    <div class="a-btns">
      <button class="a-btn primary" onclick={() => onOpen('pro')}>Offrir du Pro</button>
      {#if data.pro}<button class="a-btn danger" onclick={() => onOpen('unpro')}>Retirer</button>{/if}
    </div>
  </section>

  <section class="a-section">
    <div class="a-section-head"><h3>Gérer le compte</h3></div>
    <div class="manage">
      <button class="a-btn" onclick={() => onOpen('username')}>Changer le pseudo</button>
      <button class="a-btn" onclick={() => onOpen('stats')}>Modifier niveau, XP, ELO</button>
      <button class="a-btn" onclick={() => onOpen('reset')}>Remettre les stats à zéro</button>
      <button class="a-btn" onclick={() => onOpen('role')} disabled={data.isSelf} title={data.isSelf ? 'Impossible de modifier son propre rôle' : undefined}>
        {p.role === 'super_admin' ? 'Retirer les droits admin' : 'Nommer admin'}
      </button>
      {#if data.isBanned}
        <button class="a-btn good" onclick={() => onOpen('unban')}>Débannir</button>
      {:else}
        <button class="a-btn danger" onclick={() => onOpen('ban')}>Bannir</button>
      {/if}
      <button class="a-btn danger" onclick={() => onOpen('delete')}>Supprimer le compte</button>
    </div>
    <p class="a-muted uid">Identifiant : {p.id}</p>
  </section>
</aside>

<style>
  .pro.on { border-color: var(--a-accent); background: linear-gradient(160deg, var(--a-accent-soft), var(--a-surface) 70%); }
  .big-line { display: flex; align-items: baseline; gap: 8px; font-weight: 600; }
  .note { font-size: 0.82rem; color: var(--a-warn); }
  .manage { display: grid; gap: 8px; }
  .manage .a-btn { justify-content: flex-start; }
  .uid { font-size: 0.75rem; overflow-wrap: anywhere; }

  @media (max-width: 1099px) {
    .side { order: -1; }
  }
  @media (min-width: 700px) {
    .manage { grid-template-columns: 1fr 1fr; }
  }
  @media (min-width: 1100px) {
    .manage { grid-template-columns: 1fr; }
    .side { position: sticky; top: 80px; }
  }
</style>
