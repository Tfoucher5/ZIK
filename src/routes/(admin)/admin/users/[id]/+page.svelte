<script>
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import UserHistory from '$lib/components/admin/user/UserHistory.svelte';
  import UserSocial from '$lib/components/admin/user/UserSocial.svelte';
  import UserLog from '$lib/components/admin/user/UserLog.svelte';
  import UserSide from '$lib/components/admin/user/UserSide.svelte';
  import UserActionSheet from '$lib/components/admin/user/UserActionSheet.svelte';
  import { ago } from '$lib/shared/admin/stats-utils.js';
  import { avatarOf, lastSeen } from '$lib/shared/admin/players.js';
  import { date } from '$lib/components/admin/user/userAdmin.js';

  let { data, form } = $props();

  const p = $derived(data.profile);
  const proActive = $derived(
    data.pro?.status === 'active' && new Date(data.pro.current_period_end) > new Date(),
  );
  const proDaysLeft = $derived(
    proActive ? Math.ceil((new Date(data.pro.current_period_end) - Date.now()) / 86400000) : 0,
  );

  const TIERS = { bronze: 'Bronze', silver: 'Argent', gold: 'Or' };

  let sheetOpen = $state(false);
  let mode = $state('');
  let busy = $state(false);

  function openSheet(m) {
    mode = m;
    sheetOpen = true;
  }

  const submit = () => {
    busy = true;
    return async ({ result, update }) => {
      busy = false;
      await update({ reset: false });
      if (result.type === 'success') sheetOpen = false;
    };
  };
</script>

<div class="adm-page">
  <PageHeader title="Joueur">
    <a class="a-btn small" href="/admin/users">Tous les joueurs</a>
  </PageHeader>

  <div class="a-stack">
    {#if form?.error}<p class="a-card bad a-err" role="alert">{form.error}</p>{/if}
    {#if form?.message}<p class="a-card good a-ok" role="status">{form.message}</p>{/if}

    <section class="a-card hero">
      <img class="a-avatar big" src={avatarOf(p)} alt="" />
      <div class="id">
        <h2>{p.username}</h2>
        <div class="tags">
          {#if p.role === 'super_admin'}<em class="a-tag warn">Admin</em>{/if}
          {#if proActive}<em class="a-tag accent">Pro</em>{/if}
          {#if data.isBanned}<em class="a-tag bad">Banni jusqu'au {date(data.account.bannedUntil)}</em>{/if}
          {#if p.is_private}<em class="a-tag">Profil privé</em>{/if}
          {#if p.discord_username}<em class="a-tag">Discord : {p.discord_username}</em>{/if}
        </div>
        <p class="meta">
          Inscrit le {date(p.created_at)}
          {#if data.account.lastSignIn}· connecté {ago(data.account.lastSignIn)}{/if}
          {#if data.account.provider && data.account.provider !== 'email'}· via {data.account.provider}{/if}
        </p>
        {#if data.account.email}<p class="meta"><a href="mailto:{data.account.email}">{data.account.email}</a></p>{/if}
      </div>
      <a class="a-btn small public" href="/user/{encodeURIComponent(p.username)}" target="_blank" rel="noreferrer">Profil public</a>
    </section>

    <div class="a-kpis">
      <div class="a-kpi"><span class="a-kpi-label">Niveau</span><span class="a-kpi-value">{p.level}</span><span class="a-kpi-sub">{p.xp.toLocaleString('fr-FR')} XP</span></div>
      <div class="a-kpi"><span class="a-kpi-label">Parties</span><span class="a-kpi-value">{p.games_played}</span><span class="a-kpi-sub">{data.stats.month} sur 30 jours</span></div>
      <div class="a-kpi"><span class="a-kpi-label">Victoires</span><span class="a-kpi-value">{data.stats.wins}</span><span class="a-kpi-sub">{data.stats.podiums} podiums</span></div>
      <div class="a-kpi"><span class="a-kpi-label">ELO</span><span class="a-kpi-value">{p.elo}</span><span class="a-kpi-sub">score total {(p.total_score ?? 0).toLocaleString('fr-FR')}</span></div>
      <div class="a-kpi"><span class="a-kpi-label">Dernière partie</span><span class="a-kpi-value small">{lastSeen(p.last_played_date) ?? 'jamais'}</span><span class="a-kpi-sub">série record : {p.best_streak ?? 0} j</span></div>
    </div>

    <div class="a-cols">
      <div>
        <UserHistory {data} />

        <section class="a-section">
          <div class="a-section-head"><h3>Succès obtenus</h3><span class="a-muted">{data.achievements.length}</span></div>
          {#if data.achievements.length}
            <ul class="ach">
              {#each data.achievements as a (a.id)}
                <li title="Obtenu {date(a.unlocked_at)}">
                  <span aria-hidden="true">{a.icon}</span>
                  <span>{a.name}{#if a.tier}<em class="tier {a.tier}">{TIERS[a.tier] ?? a.tier}</em>{/if}</span>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="a-empty">Aucun succès pour l'instant.</p>
          {/if}
        </section>

        <UserSocial {data} {submit} {busy} />

        <UserLog {p} reports={data.reports} audit={data.audit} />
      </div>

      <UserSide {p} {data} {proActive} {proDaysLeft} onOpen={openSheet} />
    </div>
  </div>
</div>

<UserActionSheet bind:open={sheetOpen} {mode} {p} {data} {proActive} {submit} {busy} />

<style>
  .hero { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
  .a-avatar.big { width: 72px; height: 72px; }
  .id { flex: 1 1 200px; display: grid; gap: 6px; min-width: 0; }
  .id h2 { font-family: var(--a-display); font-size: 2rem; font-weight: 800; line-height: 1; overflow-wrap: anywhere; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .meta { font-size: 0.85rem; color: var(--a-muted); overflow-wrap: anywhere; }
  .meta a { color: var(--a-cyan); }
  .public { align-self: flex-start; }
  .a-kpi-value.small { font-size: 1.3rem; }


  .ach { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; }
  .ach li { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border: 1px solid var(--a-line); border-radius: 99px; background: var(--a-surface2); font-size: 0.85rem; font-weight: 600; }
  .tier { margin-left: 6px; font-size: 0.72rem; font-style: normal; color: var(--a-muted); }
  .tier.bronze { color: #d08a4c; }
  .tier.silver { color: #c9d1dc; }
  .tier.gold { color: var(--a-warn); }
</style>
