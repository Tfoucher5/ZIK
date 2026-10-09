<script>
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import { ago } from '$lib/admin/stats-utils.js';
  import { avatarOf, lastSeen, PLAN_LABELS, ACTION_LABELS } from '$lib/admin/players.js';
  import { subjectLabel } from '$lib/admin/reports.js';

  let { data, form } = $props();

  const p = $derived(data.profile);
  const proActive = $derived(
    data.pro?.status === 'active' && new Date(data.pro.current_period_end) > new Date(),
  );
  const proDaysLeft = $derived(
    proActive ? Math.ceil((new Date(data.pro.current_period_end) - Date.now()) / 86400000) : 0,
  );

  const salonHosted = $derived.by(() => {
    const h = data.salon.hosted;
    const counts = h.map((g) => g.player_count ?? 0);
    const monthAgo = Date.now() - 30 * 86400000;
    return {
      month: h.filter((g) => new Date(g.started_at).getTime() > monthAgo).length,
      avg: counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0,
      max: counts.length ? Math.max(...counts) : 0,
      limits: h.reduce((n, g) => n + (g.limit_hits ?? 0), 0),
    };
  });
  const salonRows = $derived(
    [
      ...data.salon.hosted.map((g) => ({ key: `h${g.id}`, host: true, code: g.room_id, at: g.started_at, players: g.player_count, ended: !!g.ended_at })),
      ...data.salon.played.map((p) => ({ key: `p${p.id}`, host: false, code: p.games.room_id, at: p.games.started_at, players: p.games.player_count, rank: p.rank, score: p.score, team: p.team })),
    ]
      .sort((a, b) => new Date(b.at ?? 0) - new Date(a.at ?? 0))
      .slice(0, 15),
  );

  const BANS = [
    ['24h', '24 heures'],
    ['168h', '7 jours'],
    ['720h', '30 jours'],
    ['8760h', '1 an'],
    ['87600h', 'Définitif (10 ans)'],
  ];
  const TIERS = { bronze: 'Bronze', silver: 'Argent', gold: 'Or' };
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

  let sheetOpen = $state(false);
  let mode = $state('');
  let busy = $state(false);
  let banDuration = $state('168h');
  let proDays = $state(30);
  let confirmName = $state('');
  let social = $state('friends');
  let armed = $state('');

  function openSheet(m) {
    mode = m;
    confirmName = '';
    sheetOpen = true;
  }

  const submit = () => {
    busy = true;
    return async ({ result, update }) => {
      busy = false;
      armed = '';
      await update({ reset: false });
      if (result.type === 'success') sheetOpen = false;
    };
  };

  function arm(e, key) {
    if (armed !== key) {
      e.preventDefault();
      armed = key;
    }
  }

  const date = (iso, withTime = false) =>
    iso
      ? new Date(iso).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
        })
      : '—';
  const proEnd = $derived(
    new Date(Math.max(Date.now(), proActive ? new Date(data.pro.current_period_end).getTime() : 0) + (Number(proDays) || 0) * 86400000),
  );

  function detail(a) {
    const x = a.payload ?? {};
    if (a.action === 'ban_user') return BANS.find(([k]) => k === x.duration)?.[1];
    if (a.action === 'set_pro') return x.days ? `${x.days} jour${x.days > 1 ? 's' : ''} offert${x.days > 1 ? 's' : ''}` : 'accès retiré';
    if (a.action === 'set_role') return x.role === 'super_admin' ? 'nommé admin' : 'joueur simple';
    if (a.action === 'edit_username' || a.action === 'delete_user') return x.username;
    if (a.action === 'edit_stats') return `niveau ${x.level}, ${x.xp} XP, ELO ${x.elo}`;
    return '';
  }

  const socialLists = $derived({
    friends: data.friendships,
    following: data.following,
    followers: data.followers,
  });
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
        <section class="a-section">
          <div class="a-section-head"><h3>Dernières parties</h3><span class="a-muted">{data.stats.games} au total</span></div>
          {#if data.games.length}
            <ul class="a-list">
              {#each data.games as g (g.id)}
                <li class="a-row">
                  <span class="rank" class:first={g.rank === 1}>{g.rank ? `${g.rank}e` : '—'}</span>
                  <span class="a-row-main">
                    <span class="a-row-title">{g.room ? `${g.room.emoji ?? ''} ${g.room.name}` : `Partie ${g.code ?? ''}`}</span>
                    <span class="a-row-sub">{g.startedAt ? ago(g.startedAt) : 'date inconnue'}{g.rounds ? ` · ${g.rounds} manches` : ''}{g.players ? ` · ${g.players} joueurs` : ''}</span>
                  </span>
                  <b class="score">{g.score ?? 0} pts</b>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="a-empty">Aucune partie enregistrée.</p>
          {/if}
        </section>

        <section class="a-section">
          <div class="a-section-head"><h3>Mode salon</h3><span class="a-muted">{data.salon.hosted.length} animé{data.salon.hosted.length > 1 ? 's' : ''} · {data.salon.played.length} joué{data.salon.played.length > 1 ? 's' : ''}</span></div>
          {#if data.salon.hosted.length}
            <div class="a-kpis">
              <div class="a-kpi"><span class="a-kpi-label">Parties animées</span><span class="a-kpi-value">{data.salon.hosted.length}</span><span class="a-kpi-sub">{salonHosted.month} sur 30 jours</span></div>
              <div class="a-kpi"><span class="a-kpi-label">Joueurs en moyenne</span><span class="a-kpi-value">{salonHosted.avg}</span><span class="a-kpi-sub">record : {salonHosted.max}</span></div>
              <div class="a-kpi"><span class="a-kpi-label">Bloqué par la limite</span><span class="a-kpi-value">{salonHosted.limits}</span><span class="a-kpi-sub">joueurs refusés (salon plein)</span></div>
            </div>
          {/if}
          {#if salonRows.length}
            <ul class="a-list">
              {#each salonRows as g (g.key)}
                <li class="a-row">
                  <em class="a-tag {g.host ? 'accent' : ''}">{g.host ? 'Hôte' : g.rank ? `${g.rank}e` : 'Joueur'}</em>
                  <span class="a-row-main">
                    <span class="a-row-title">Salon {g.code ?? ''}{g.team ? ` · ${g.team}` : ''}</span>
                    <span class="a-row-sub">{g.at ? ago(g.at) : 'date inconnue'}{g.players != null ? ` · ${g.players} joueurs` : ''}{g.host && !g.ended ? ' · pas terminée' : ''}</span>
                  </span>
                  {#if !g.host}<b class="score">{g.score ?? 0} pts</b>{/if}
                </li>
              {/each}
            </ul>
          {:else}
            <p class="a-empty">Aucun salon lié à ce compte. L’hôte et les joueurs connectés ne sont enregistrés que depuis la refonte de l’admin.</p>
          {/if}
        </section>

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

        <section class="a-section">
          <div class="a-section-head"><h3>Amis et abonnements</h3></div>
          <div class="a-chips" role="group" aria-label="Liste affichée">
            <button class="a-chip" aria-pressed={social === 'friends'} onclick={() => (social = 'friends')}>Amis<b>{data.friendships.length}</b></button>
            <button class="a-chip" aria-pressed={social === 'following'} onclick={() => (social = 'following')}>Il suit<b>{data.following.length}</b></button>
            <button class="a-chip" aria-pressed={social === 'followers'} onclick={() => (social = 'followers')}>Le suivent<b>{data.followers.length}</b></button>
          </div>
          {#if socialLists[social].length}
            <ul class="a-list">
              {#each socialLists[social] as s (s.id)}
                {@const key = `${social}-${s.id}`}
                <li class="a-row">
                  <img class="a-avatar" src={avatarOf(s.user)} alt="" loading="lazy" />
                  <span class="a-row-main">
                    {#if s.user}<a class="a-row-title" href="/admin/users/{s.user.id}">{s.user.username}</a>{:else}<span class="a-row-title">Compte supprimé</span>{/if}
                    <span class="a-row-sub">
                      {#if social === 'friends'}{s.status === 'accepted' ? 'Amis' : 'Demande en attente'} · {/if}{ago(s.at)}
                    </span>
                  </span>
                  <form method="POST" action={social === 'friends' ? '?/deleteFriendship' : '?/deleteFollow'} use:enhance={submit}>
                    <input type="hidden" name="id" value={s.id} />
                    <button class="a-btn small" class:danger={armed === key} onclick={(e) => arm(e, key)} disabled={busy}>
                      {armed === key ? 'Confirmer' : social === 'friends' ? 'Supprimer' : 'Retirer'}
                    </button>
                  </form>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="a-empty">Rien ici.</p>
          {/if}
        </section>

        <section class="a-section">
          <div class="a-section-head"><h3>Messages et signalements</h3><span class="a-muted">{data.reports.length}</span></div>
          {#if data.reports.length}
            <ul class="a-list">
              {#each data.reports as r (r.id)}
                <li>
                  <a class="a-row" href="/admin/reports?id={r.id}">
                    <span class="a-row-main">
                      <span class="a-row-title">{subjectLabel(r)}</span>
                      <span class="a-row-sub">{r.reporter_id === p.id ? 'Envoyé par ce joueur' : 'Vise ce joueur'} · {ago(r.created_at)}{r.message ? ` · « ${r.message} »` : ''}</span>
                    </span>
                    <em class="a-tag {r.status === 'pending' ? 'warn' : r.status === 'resolved' ? 'good' : ''}">{r.status === 'pending' ? 'À traiter' : r.status === 'resolved' ? 'Traité' : 'Classé'}</em>
                  </a>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="a-empty">Aucun message de ce joueur.</p>
          {/if}
        </section>

        <section class="a-section">
          <div class="a-section-head"><h3>Actions de l'admin</h3><span class="a-muted">{data.audit.length}</span></div>
          {#if data.audit.length}
            <ol class="log">
              {#each data.audit as a (a.id)}
                <li>
                  <b>{ACTION_LABELS[a.action] ?? a.action}</b>
                  {#if detail(a)}<span>{detail(a)}</span>{/if}
                  <span class="a-muted">{a.admin ? `par ${a.admin} · ` : ''}{date(a.created_at, true)}</span>
                </li>
              {/each}
            </ol>
          {:else}
            <p class="a-empty">Aucune action admin sur ce compte.</p>
          {/if}
        </section>
      </div>

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
            <button class="a-btn primary" onclick={() => openSheet('pro')}>Offrir du Pro</button>
            {#if data.pro}<button class="a-btn danger" onclick={() => openSheet('unpro')}>Retirer</button>{/if}
          </div>
        </section>

        <section class="a-section">
          <div class="a-section-head"><h3>Gérer le compte</h3></div>
          <div class="manage">
            <button class="a-btn" onclick={() => openSheet('username')}>Changer le pseudo</button>
            <button class="a-btn" onclick={() => openSheet('stats')}>Modifier niveau, XP, ELO</button>
            <button class="a-btn" onclick={() => openSheet('reset')}>Remettre les stats à zéro</button>
            <button class="a-btn" onclick={() => openSheet('role')} disabled={data.isSelf} title={data.isSelf ? 'Impossible de modifier son propre rôle' : undefined}>
              {p.role === 'super_admin' ? 'Retirer les droits admin' : 'Nommer admin'}
            </button>
            {#if data.isBanned}
              <button class="a-btn good" onclick={() => openSheet('unban')}>Débannir</button>
            {:else}
              <button class="a-btn danger" onclick={() => openSheet('ban')}>Bannir</button>
            {/if}
            <button class="a-btn danger" onclick={() => openSheet('delete')}>Supprimer le compte</button>
          </div>
          <p class="a-muted uid">Identifiant : {p.id}</p>
        </section>
      </aside>
    </div>
  </div>
</div>

<Sheet bind:open={sheetOpen} title={TITLES[mode] ?? ''}>
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
  .hero { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
  .a-avatar.big { width: 72px; height: 72px; }
  .id { flex: 1 1 200px; display: grid; gap: 6px; min-width: 0; }
  .id h2 { font-family: var(--a-display); font-size: 2rem; font-weight: 800; line-height: 1; overflow-wrap: anywhere; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .meta { font-size: 0.85rem; color: var(--a-muted); overflow-wrap: anywhere; }
  .meta a { color: var(--a-cyan); }
  .public { align-self: flex-start; }
  .a-kpi-value.small { font-size: 1.3rem; }

  .rank { flex: 0 0 38px; font-family: var(--a-display); font-size: 1.3rem; font-weight: 800; color: var(--a-dim); text-align: center; }
  .rank.first { color: var(--a-warn); }
  .score { flex: 0 0 auto; font-variant-numeric: tabular-nums; }
  .a-row-title { color: var(--a-fg); }
  a.a-row-title:hover { color: var(--a-accent); }

  .ach { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; }
  .ach li { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border: 1px solid var(--a-line); border-radius: 99px; background: var(--a-surface2); font-size: 0.85rem; font-weight: 600; }
  .tier { margin-left: 6px; font-size: 0.72rem; font-style: normal; color: var(--a-muted); }
  .tier.bronze { color: #d08a4c; }
  .tier.silver { color: #c9d1dc; }
  .tier.gold { color: var(--a-warn); }

  .log { display: grid; gap: 0; list-style: none; }
  .log li { display: flex; flex-wrap: wrap; gap: 4px 10px; padding: 10px 0; border-bottom: 1px solid var(--a-line); font-size: 0.88rem; }
  .log li:last-child { border-bottom: 0; }
  .log li > .a-muted { margin-left: auto; font-size: 0.8rem; }

  .pro.on { border-color: var(--a-accent); background: linear-gradient(160deg, var(--a-accent-soft), var(--a-surface) 70%); }
  .big-line { display: flex; align-items: baseline; gap: 8px; font-weight: 600; }
  .note { font-size: 0.82rem; color: var(--a-warn); }
  .manage { display: grid; gap: 8px; }
  .manage .a-btn { justify-content: flex-start; }
  .uid { font-size: 0.75rem; overflow-wrap: anywhere; }
  .name { color: var(--a-fg); }

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
