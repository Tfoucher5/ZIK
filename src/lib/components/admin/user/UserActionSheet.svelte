<script>
  import { enhance } from '$app/forms';
  import Sheet from '$lib/components/admin/Sheet.svelte';
  import { BANS, date } from './userAdmin.js';

  /** Fenêtre des actions sur le compte : Pro, pseudo, stats, rôle, bannissement, suppression. */
  let { open = $bindable(), mode, p, data, proActive, submit, busy } = $props();

  const PRO_DAYS = [1, 7, 30, 90, 365];
  const TITLES = {
    pro: 'Offrir du Pro',
    unpro: 'Retirer le Pro',
    username: 'Changer le pseudo',
    stats: 'Modifier les stats',
    reset: 'Remettre à zéro',
    role: 'Changer le rôle',
    ban: 'Bannir le joueur',
    unban: 'Débannir le joueur',
    delete: 'Supprimer le compte',
  };

  let banDuration = $state('168h');
  let proDays = $state(30);
  let confirmName = $state('');

  // Champ de confirmation vidé à chaque ouverture
  $effect(() => {
    if (open) confirmName = '';
  });

  const proEnd = $derived(
    new Date(Math.max(Date.now(), proActive ? new Date(data.pro.current_period_end).getTime() : 0) + (Number(proDays) || 0) * 86400000),
  );
</script>

<Sheet bind:open title={TITLES[mode] ?? ''}>
  {#if mode === 'pro'}
    <form class="a-form" method="POST" action="?/setPro" use:enhance={submit}>
      <div class="a-chips" role="group" aria-label="Durée">
        {#each PRO_DAYS as d (d)}
          <button type="button" class="a-chip" aria-pressed={Number(proDays) === d} onclick={() => (proDays = d)}>
            {d === 1 ? '1 soirée' : d === 365 ? '1 an' : `${d} jours`}
          </button>
        {/each}
      </div>
      <label class="a-label">Nombre de jours<input class="a-input" type="number" name="days" min="1" max="3650" bind:value={proDays} required /></label>
      <p class="a-muted">{proActive ? 'Ajouté à la suite de son accès actuel.' : 'Démarre maintenant.'} Fin le <b>{date(proEnd.toISOString())}</b>.</p>
      <button class="a-btn primary" disabled={busy || !(proDays > 0)}>Offrir {proDays} jour{proDays > 1 ? 's' : ''}</button>
    </form>
  {:else if mode === 'unpro'}
    <form class="a-form" method="POST" action="?/setPro" use:enhance={submit}>
      <input type="hidden" name="days" value="0" />
      <p>{p.username} perd tout de suite son accès ZIK Pro.{#if data.pro?.stripe_subscription_id} Son abonnement par carte n'est pas résilié chez Stripe.{/if}</p>
      <button class="a-btn danger" disabled={busy}>Retirer l'accès Pro</button>
    </form>
  {:else if mode === 'username'}
    <form class="a-form" method="POST" action="?/editUsername" use:enhance={submit}>
      <label class="a-label">Nouveau pseudo<input class="a-input" name="username" value={p.username} minlength="3" maxlength="20" required autocomplete="off" /></label>
      <button class="a-btn primary" disabled={busy}>Enregistrer</button>
    </form>
  {:else if mode === 'stats'}
    <form class="a-form" method="POST" action="?/editStats" use:enhance={submit}>
      <div class="a-form-row">
        <label class="a-label">Niveau<input class="a-input" type="number" name="level" value={p.level} min="1" max="1000" /></label>
        <label class="a-label">XP<input class="a-input" type="number" name="xp" value={p.xp} min="0" /></label>
        <label class="a-label">ELO<input class="a-input" type="number" name="elo" value={p.elo} min="0" max="99999" /></label>
      </div>
      <button class="a-btn primary" disabled={busy}>Enregistrer</button>
    </form>
  {:else if mode === 'reset'}
    <form class="a-form" method="POST" action="?/resetStats" use:enhance={submit}>
      <p>Niveau 1, 0 XP, ELO 1000, 0 partie et score total à 0. L'historique des parties et les succès restent.</p>
      <button class="a-btn danger" disabled={busy}>Remettre à zéro</button>
    </form>
  {:else if mode === 'role'}
    <form class="a-form" method="POST" action="?/setRole" use:enhance={submit}>
      <input type="hidden" name="role" value={p.role === 'super_admin' ? 'user' : 'super_admin'} />
      <p>
        {#if p.role === 'super_admin'}{p.username} n'aura plus accès à l'admin.{:else}{p.username} aura accès à toute l'admin, comme toi.{/if}
      </p>
      <button class="a-btn {p.role === 'super_admin' ? 'danger' : 'primary'}" disabled={busy}>
        {p.role === 'super_admin' ? 'Retirer les droits admin' : 'Nommer admin'}
      </button>
    </form>
  {:else if mode === 'ban'}
    <form class="a-form" method="POST" action="?/ban" use:enhance={submit}>
      <p>{p.username} ne pourra plus se connecter pendant la durée choisie.</p>
      <label class="a-label">Durée
        <select class="a-select" name="duration" bind:value={banDuration}>
          {#each BANS as [v, label] (v)}<option value={v}>{label}</option>{/each}
        </select>
      </label>
      <button class="a-btn danger" disabled={busy}>Bannir</button>
    </form>
  {:else if mode === 'unban'}
    <form class="a-form" method="POST" action="?/unban" use:enhance={submit}>
      <p>{p.username} pourra de nouveau se connecter.</p>
      <button class="a-btn good" disabled={busy}>Débannir</button>
    </form>
  {:else if mode === 'delete'}
    <form class="a-form" method="POST" action="?/deleteUser" use:enhance={submit}>
      <p>Le compte, le profil et les données liées sont supprimés pour de bon. Impossible de revenir en arrière.</p>
      <label class="a-label">Tape <b class="name">{p.username}</b> pour confirmer
        <input class="a-input" name="confirm_username" bind:value={confirmName} placeholder={p.username} autocomplete="off" />
      </label>
      <button class="a-btn danger" disabled={busy || confirmName.trim() !== p.username}>Supprimer définitivement</button>
    </form>
  {/if}
</Sheet>

<style>
  .name { color: var(--a-fg); }
</style>
