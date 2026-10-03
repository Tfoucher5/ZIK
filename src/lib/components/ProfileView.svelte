<script>
  import { dicebear } from '$lib/utils.js';
  import {
    fmtScore, fmtSince, fmtDate, pct,
    xpForNextLevel, xpPercent, eloRatio,
    buildCurve, buildItinerary, rangOrdinal, rangDetail,
  } from '$lib/profile/stats.js';
  import AchievementsPanel from '$lib/components/AchievementsPanel.svelte';
  import InviteModal from '$lib/components/InviteModal.svelte';
  import ProfileSummary from '$lib/components/profile/ProfileSummary.svelte';

  let { profile, stats, sb, userId, viewerId = null, editable = false, onEdit = () => {} } = $props();

  const isOwn = $derived(viewerId != null && viewerId === profile?.id);
  const canFollow = $derived(viewerId != null && !isOwn);

  // ── Données sociales (abonnés / abonnements / amis) ──
  let social = $state({ followers: 0, following: 0, friendsCount: 0, friends: [], viewerFollows: false, followsViewer: false, friendStatus: 'none', isFriend: false, pendingRequests: [], pendingCount: 0 });
  let followBusy = $state(false);
  let friendBusy = $state(false);
  let presenceMap = $state({});
  let inviteOpen = $state(false);
  let inviteTarget = $state(null);

  async function loadSocial() {
    if (!sb || !profile?.id) return;
    try {
      const token = (await sb.auth.getSession())?.data?.session?.access_token;
      const r = await fetch(`/api/social/${profile.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (r.ok) social = await r.json();
      loadPresence();
    } catch { /* réseau indisponible */ }
  }

  // Présence : mes amis (mon profil) ou le propriétaire du profil (si ami)
  async function loadPresence() {
    if (!viewerId) return;
    const ids = isOwn ? social.friends.map(f => f.id) : social.isFriend ? [profile.id] : [];
    if (!ids.length) { presenceMap = {}; return; }
    try {
      const token = (await sb.auth.getSession())?.data?.session?.access_token;
      const r = await fetch(`/api/presence?ids=${ids.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) presenceMap = await r.json();
    } catch { /* réseau indisponible */ }
  }

  function joinFriendRoom(room) {
    const username = sessionStorage.getItem('zik_uname') || 'Joueur';
    const p = new URLSearchParams({
      roomId: room.roomId,
      username,
      userId: viewerId || '',
      isGuest: '0',
      gameMode: room.gameMode || 'classic',
    });
    window.location.href = `/game?${p}`;
  }

  function openInvite(target) {
    inviteTarget = target;
    inviteOpen = true;
  }

  async function toggleFollow() {
    if (followBusy || !canFollow) return;
    followBusy = true;
    try {
      const token = (await sb.auth.getSession())?.data?.session?.access_token;
      const r = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetId: profile.id }),
      });
      if (r.ok) await loadSocial();
    } finally {
      followBusy = false;
    }
  }

  async function friendAction(action, targetId = profile.id) {
    if (friendBusy) return;
    friendBusy = true;
    try {
      const token = (await sb.auth.getSession())?.data?.session?.access_token;
      const r = await fetch('/api/friend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetId, action }),
      });
      if (r.ok) await loadSocial();
    } finally {
      friendBusy = false;
    }
  }

  $effect(() => {
    if (profile?.id) loadSocial();
  });

  let mode = $state('classic');
  const isQcm = $derived(mode === 'qcm');
  const m = $derived(isQcm ? stats?.qcm : stats);

  const name   = $derived(profile?.username || 'Joueur');
  const avatar = $derived(profile?.avatar_url || dicebear(name));


  const lvl = $derived(profile?.level ?? 1);
  const xpMax = $derived(xpForNextLevel(lvl));
  const xpPct = $derived(xpPercent(profile?.xp, lvl));
  const powerSegs = 26;
  const powerOn = $derived(Math.round(powerSegs * xpPct / 100));

  // Cadran ELO : ratio sur une plage 800→2200
  const elo = $derived(profile?.elo ?? 0);
  const ratioElo = $derived(eloRatio(elo));
  const dialCirc = 311;
  const dialOffset = $derived(dialCirc * (1 - ratioElo));
  const dialAngle = $derived(-90 + ratioElo * 180);

  // Stats du rider selon le mode
  const total   = $derived(m?.winRate?.total ?? 0);
  const wins    = $derived(m?.winRate?.wins ?? 0);
  const podiums = $derived(m?.podiums ?? 0);
  const avg     = $derived(total > 0 ? Math.round((m?.totalScore ?? 0) / total) : 0);

  const riderStats = $derived([
    { k: 'Parties jouées', v: total || '—' },
    { k: 'Meilleur score', v: fmtScore(m?.bestScore ?? 0) },
    { k: 'Score total', v: fmtScore(m?.totalScore ?? 0) },
    { k: 'Score moyen', v: avg || '—' },
    { k: 'Taux de podium', v: `${pct(podiums, total)}%` },
    { k: '1ères places', v: `${pct(wins, total)}% · ${wins}` },
    { k: 'Ce mois', v: `${m?.gamesThisMonth ?? 0} parties` },
  ]);

  // Courbe de forme
  const recent = $derived(m?.recentGames ?? []);
  const curve = $derived(buildCurve(recent));

  // Meilleurs scores par room officielle
  const itinerary = $derived(buildItinerary(m?.bestByRoom, m?.roomInfo));

  // Types de pass (répartition)
  const byType = $derived(m?.scoreByRoomType ?? { official: { count: 0, totalScore: 0 }, public: { count: 0, totalScore: 0 }, private: { count: 0, totalScore: 0 } });
  const typeTotal = $derived(byType.official.count + byType.public.count + byType.private.count);
  const typePct = (c) => (typeTotal > 0 ? Math.round((c / typeTotal) * 100) : 0);

  // Carnet de route (historique classique + QCM fusionnés)
  const carnet = $derived(
    [
      ...(stats?.recentGames ?? []).map(g => ({ ...g, gmode: 'cl' })),
      ...(stats?.qcm?.recentGames ?? []).map(g => ({ ...g, gmode: 'qcm' })),
    ]
      .sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt))
      .slice(0, 6)
  );
  function rankLabel(r) {
    if (r == null) return '—';
    if (r === 1) return '🥇 1er';
    if (r === 2) return '🥈 2e';
    if (r === 3) return '🥉 3e';
    return `#${r}`;
  }

  // Le rang brut ne dit rien sans son dénominateur : l'API renvoie déjà
  // totalPlayers et topPercent, qui n'étaient pas exploités.
  const rank = $derived(stats?.rank);
  const totalPlayers = $derived(stats?.totalPlayers);
  const topPercent = $derived(stats?.topPercent);
  const ordinal = $derived(rangOrdinal(rank));
  const detailRang = $derived(rangDetail(rank, totalPlayers, topPercent));

  // Nav setlist
  // Sommaire déclaratif : une section n'est rendue que si elle a du contenu,
  // sinon elle laissait un en-tête numéroté suivi de vide. Ajouter un bloc
  // (stats Salon, espace Pro) = une entrée ici, le sommaire suit tout seul.
  const sectionDefs = [
    { id: 'rider', t: 'Performances', quand: () => stats != null },
    { id: 'tour',  t: 'Meilleurs scores', quand: () => itinerary.length > 0 || typeTotal > 0 },
    { id: 'log',   t: 'Dernières parties', quand: () => carnet.length > 0 },
    { id: 'case',  t: 'Badges', quand: () => true },
    { id: 'guests', t: 'Amis', quand: () => true },
  ];
  const sections = $derived(
    sectionDefs.filter(s => s.quand()).map((s, i) => ({
      ...s, n: String(i + 1).padStart(2, '0'),
    }))
  );
  const visible = $derived(new Set(sections.map(s => s.id)));
  const numDe = (id) => sections.find(s => s.id === id)?.n ?? '';
  let activeSection = $state('rider');

  // Reveal au scroll (action Svelte)
  function reveal(node) {
    const io = new IntersectionObserver((es) => {
      es.forEach(e => { if (e.isIntersecting) { node.classList.add('in'); io.unobserve(node); } });
    }, { threshold: 0.14, rootMargin: '0px 0px -60px 0px' });
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }

  // Scrollspy pour le rail
  $effect(() => {
    const els = sections.map(s => document.getElementById('pv-' + s.id)).filter(Boolean);
    if (!els.length) return;
    const spy = new IntersectionObserver((es) => {
      es.forEach(e => { if (e.isIntersecting) activeSection = e.target.id.replace('pv-', ''); });
    }, { rootMargin: '-30% 0px -60% 0px' });
    els.forEach(el => spy.observe(el));
    return () => spy.disconnect();
  });

  function goTo(id) {
    document.getElementById('pv-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

</script>

<div class="pv">
  <div class="beams" aria-hidden="true"><i></i><i></i><i></i></div>

  <!-- ═══ HERO AFFICHE ═══ -->
  <header class="marquee">
    <div class="marquee-top">
      <span class="eyebrow">ZIK · <b>Profil</b></span>
      <span class="rule"></span>
      <span class="eyebrow">Niveau {lvl}</span>
    </div>

    <div class="marquee-grid">
      <div class="headliner">
        <div class="identity">
          <img class="identity-av" src={avatar} alt="" width="84" height="84">
          <h1 class="name">{name}<span class="pt">.</span></h1>
        </div>
        <div class="tagline">
          {#if profile?.created_at}Membre depuis {fmtSince(profile.created_at)} · {/if}
          <b>{profile?.games_played ?? total ?? 0} parties jouées</b>
        </div>

        <div class="headline-stats">
          <div class="hs max"><b>{elo || '—'}</b><span>ELO</span></div>
          <div class="hs"><b>{fmtScore(profile?.total_score ?? m?.totalScore ?? 0)}</b><span>Score total</span></div>
          <div class="hs"><b>{pct(podiums, total)}%</b><span>Podiums</span></div>
          {#if ordinal}<div class="hs gold"><b>{ordinal}</b><span>{detailRang}</span></div>{/if}
        </div>

        <div class="social-row">
          <div class="social-cell"><b>{social.followers}</b><span>Abonnés</span></div>
          <div class="social-cell"><b>{social.following}</b><span>Abonnements</span></div>
          <div class="social-cell amis"><b>{social.friendsCount}</b><span>Amis</span></div>
        </div>

        <div class="marquee-actions">
          {#if editable || isOwn}
            <button class="btn btn-accent" onclick={onEdit}>Modifier mon profil</button>
          {:else if canFollow}
            {#if social.friendStatus === 'friends'}
              <button class="btn btn-friend" onclick={() => friendAction('remove')} disabled={friendBusy}>★ Amis</button>
              {#if presenceMap[profile.id]?.room}
                <button class="btn btn-accent" onclick={() => joinFriendRoom(presenceMap[profile.id].room)}>▶ Rejoindre sa room</button>
              {:else}
                <button class="btn" onclick={() => openInvite({ id: profile.id, username: name })}>Inviter à jouer</button>
              {/if}
            {:else if social.friendStatus === 'pending_out'}
              <button class="btn btn-following" onclick={() => friendAction('remove')} disabled={friendBusy}>⏳ Demande envoyée</button>
            {:else if social.friendStatus === 'pending_in'}
              <button class="btn btn-accent" onclick={() => friendAction('accept')} disabled={friendBusy}>✓ Accepter</button>
              <button class="btn" onclick={() => friendAction('remove')} disabled={friendBusy}>Refuser</button>
            {:else}
              <button class="btn btn-accent" onclick={() => friendAction('request')} disabled={friendBusy}>+ Ajouter en ami</button>
            {/if}
            <button class="btn" class:btn-following={social.viewerFollows} onclick={toggleFollow} disabled={followBusy}>
              {social.viewerFollows ? '✓ Suivi' : '+ Suivre'}
            </button>
            {#if social.followsViewer && !social.viewerFollows}<span class="follows-you">Vous suit</span>{/if}
          {/if}
        </div>

      </div>
    </div>
  </header>

  <!-- ═══ CORPS ═══ -->
  <div class="tour">
    <ProfileSummary {sections} active={activeSection} onGoTo={goTo} />

    <main class="program">

      <!-- 01 RIDER -->
    {#if visible.has('rider')}
      <section class="prog-block" id="pv-rider" use:reveal>
        <div class="block-head">
          <span class="block-num">{numDe('rider')}</span>
          <h2>Performances</h2>
          <span class="sub">Mode {isQcm ? 'QCM' : 'classique'}</span>
        </div>
        <div class="case rider-body">
          <div class="mode-tabs" role="tablist">
            <button class:on={!isQcm} role="tab" aria-selected={!isQcm} onclick={() => mode = 'classic'}>Classique</button>
            <button class:on={isQcm} data-mode="qcm" role="tab" aria-selected={isQcm} onclick={() => mode = 'qcm'}>QCM</button>
          </div>
          <div class="rider-top">
            <div class="dial">
              <svg viewBox="0 0 220 128" aria-hidden="true">
                <path d="M22,118 A96,96 0 0,1 198,118" fill="none" stroke="var(--pv-track)" stroke-width="14" stroke-linecap="round"/>
                <path d="M22,118 A96,96 0 0,1 198,118" fill="none" stroke="url(#pvdg)" stroke-width="14" stroke-linecap="round"
                  stroke-dasharray={dialCirc} style="stroke-dashoffset:{dialOffset}; transition:stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)"/>
                <defs><linearGradient id="pvdg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="var(--success)"/><stop offset="55%" stop-color="var(--accent)"/><stop offset="100%" stop-color="var(--gold)"/>
                </linearGradient></defs>
                <line x1="110" y1="118" x2="110" y2="46" stroke="var(--text)" stroke-width="3" stroke-linecap="round"
                  style="transform-origin:110px 118px; transform:rotate({dialAngle}deg); transition:transform 1.2s cubic-bezier(.22,1.4,.36,1)"/>
                <circle cx="110" cy="118" r="7" fill="var(--bg2)" stroke="var(--text)" stroke-width="2.5"/>
              </svg>
              <div class="dial-read"><b>{elo || '—'}</b><span>points ELO</span></div>
            </div>
            <div class="dial-side">
              <div class="kv">
                {#each riderStats as st (st.k)}
                  <div class="kv-row"><span class="k">{st.k}</span><span class="v">{st.v}</span></div>
                {/each}
              </div>
            </div>
          </div>
          <div class="power">
            <div class="power-top"><span class="lv">Niveau <b>{lvl}</b> → {lvl + 1}</span><span class="xp">{(profile?.xp ?? 0).toLocaleString('fr-FR')} / {xpMax.toLocaleString('fr-FR')} XP · {xpPct}&nbsp;%</span></div>
            <div class="power-bar">
              {#each Array(powerSegs), i (i)}<i class:on={i < powerOn}></i>{/each}
            </div>
          </div>
        </div>

        {#if curve.line}
          <div class="case form-wrap">
            <div class="eyebrow" style="margin-bottom:6px">Évolution des scores · <b>{recent.length} dernières</b></div>
            <svg viewBox="0 0 640 130" preserveAspectRatio="none" aria-hidden="true">
              <line x1="0" y1="30" x2="640" y2="30" stroke="var(--pv-grid)"/>
              <line x1="0" y1="80" x2="640" y2="80" stroke="var(--pv-grid)"/>
              <defs><linearGradient id="pvfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgb(var(--accent-rgb) / 0.28)"/><stop offset="100%" stop-color="rgb(var(--accent-rgb) / 0)"/></linearGradient></defs>
              <polygon points={curve.area} fill="url(#pvfg)"/>
              <polyline points={curve.line} fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
              {#if curve.last}<circle cx={curve.last[0]} cy={curve.last[1]} r="4.5" fill="var(--accent)"/>{/if}
            </svg>
            <div class="form-caption">
              <span>plus ancien</span>
              <span class="form-range">min {curve.min} · max {curve.max}</span>
              <span>récent · {curve.lastScore} pts</span>
            </div>
          </div>
        {/if}
      </section>
    {/if}
    {#if visible.has('tour')}
      <section class="prog-block" id="pv-tour" use:reveal>
        <div class="block-head">
          <span class="block-num">{numDe('tour')}</span>
          <h2>Meilleurs scores</h2>
          <span class="sub">Par room officielle</span>
        </div>
        <div class="split">
          <div class="case tour-map">
            {#if itinerary.length}
              <div class="tour-line"></div>
              {#each itinerary as stop (stop.room.code)}
                <div class="tour-stop">
                  <span class="tour-dot"></span>
                  <div class="tour-city"><b>{stop.room.emoji ?? '🎵'} {stop.room.name}</b><small>Room officielle</small></div>
                  <span class="tour-score">{stop.score}</span>
                </div>
              {/each}
            {:else}
              <p class="pv-empty">Aucune partie sur les rooms officielles.</p>
            {/if}
          </div>
          <div>
            <div class="tape" style="margin-bottom:14px">Répartition</div>
            <div class="case tiers">
              {#if typeTotal > 0}
                <div class="tier-bar">
                  <i style="width:{typePct(byType.official.count)}%;background:var(--accent)"></i>
                  <i style="width:{typePct(byType.public.count)}%;background:rgb(var(--accent-rgb) / 0.45)"></i>
                  <i style="width:{typePct(byType.private.count)}%;background:rgb(var(--accent-rgb) / 0.18)"></i>
                </div>
                <div class="tier-row"><span class="tier-dot" style="background:var(--accent)"></span><span class="tier-name">Rooms officielles</span><span class="tier-count">{byType.official.count}</span><span class="tier-pts">{fmtScore(byType.official.totalScore)} pts</span></div>
                <div class="tier-row"><span class="tier-dot" style="background:rgb(var(--accent-rgb) / 0.6)"></span><span class="tier-name">Rooms publiques</span><span class="tier-count">{byType.public.count}</span><span class="tier-pts">{fmtScore(byType.public.totalScore)} pts</span></div>
                <div class="tier-row"><span class="tier-dot" style="background:rgb(var(--accent-rgb) / 0.3)"></span><span class="tier-name">Rooms privées</span><span class="tier-count">{byType.private.count}</span><span class="tier-pts">{fmtScore(byType.private.totalScore)} pts</span></div>
              {:else}
                <p class="pv-empty">Aucune partie jouée.</p>
              {/if}
            </div>
          </div>
        </div>
      </section>
    {/if}
    {#if visible.has('log')}
      <section class="prog-block" id="pv-log" use:reveal>
        <div class="block-head">
          <span class="block-num">{numDe('log')}</span>
          <h2>Dernières parties</h2>
          <span class="sub">{carnet.length} dernière{carnet.length > 1 ? 's' : ''}</span>
        </div>
        <div class="case log">
          {#if carnet.length}
            <div class="log-head"><span>#</span><span>Room</span><span>Mode</span><span>Date</span><span style="text-align:right">Score</span><span style="text-align:right">Rang</span></div>
            {#each carnet as g, i (i)}
              <div class="log-row" class:cl={g.gmode === 'cl'} class:qcm={g.gmode === 'qcm'}>
                <span class="log-num">{String(i + 1).padStart(2, '0')}</span>
                <div class="log-room">{g.roomEmoji} {g.roomName}</div>
                <span class="log-mode" class:m-cl={g.gmode === 'cl'} class:m-qcm={g.gmode === 'qcm'}>{g.gmode === 'qcm' ? 'QCM' : 'Classique'}</span>
                <span class="log-date">{fmtDate(g.endedAt)}</span>
                <span class="log-score">{g.score}</span>
                <span class="log-rank" class:r1={g.rank === 1}>{rankLabel(g.rank)}</span>
              </div>
            {/each}
          {:else}
            <p class="pv-empty" style="padding:20px">Aucune partie jouée pour le moment.</p>
          {/if}
        </div>
      </section>
    {/if}
    {#if visible.has('case')}
      <section class="prog-block" id="pv-case" use:reveal>
        <div class="block-head">
          <span class="block-num">{numDe('case')}</span>
          <h2>Badges</h2>
          <span class="sub">Succès & séries</span>
        </div>
        <AchievementsPanel {sb} {userId} />
      </section>
    {/if}
    {#if visible.has('guests')}
      <section class="prog-block" id="pv-guests" use:reveal>
        <div class="block-head">
          <span class="block-num">{numDe('guests')}</span>
          <h2>Amis</h2>
          <span class="sub">{social.friendsCount} ami{social.friendsCount > 1 ? 's' : ''}</span>
        </div>

        {#if isOwn && social.pendingRequests.length}
          <div class="tape" style="margin-bottom:12px">Demandes reçues · {social.pendingCount}</div>
          <div class="case gl" style="margin-bottom:18px">
            {#each social.pendingRequests as p (p.id)}
              <div class="gl-row">
                <a class="gl-av" href="/user/{p.username}"><img src={p.avatar_url || dicebear(p.username)} alt="" width="34" height="34" loading="lazy" decoding="async"></a>
                <a class="gl-id" href="/user/{p.username}"><div class="gl-name">{p.username}</div><div class="gl-sub">Niveau {p.level ?? 1}</div></a>
                <span class="req-actions">
                  <button class="btn-req accept" onclick={() => friendAction('accept', p.id)} disabled={friendBusy}>Accepter</button>
                  <button class="btn-req" onclick={() => friendAction('remove', p.id)} disabled={friendBusy}>Refuser</button>
                </span>
              </div>
            {/each}
          </div>
        {/if}

        <div class="case gl">
          {#if social.friends.length}
            {#each social.friends as f (f.id)}
              {@const pr = presenceMap[f.id]}
              <div class="gl-row">
                <a class="gl-av" href="/user/{f.username}" class:gl-online={pr?.online}>
                  <img src={f.avatar_url || dicebear(f.username)} alt="" width="34" height="34" loading="lazy" decoding="async">
                </a>
                <a class="gl-id" href="/user/{f.username}">
                  <div class="gl-name">{f.username}</div>
                  <div class="gl-sub" class:gl-sub-live={pr?.online}>
                    {#if pr?.room}En room · {pr.room.roomName}{:else if pr?.online}En ligne{:else}Niveau {f.level ?? 1}{/if}
                  </div>
                </a>
                <span class="gl-elo">{f.elo ?? '—'} ELO</span>
                {#if isOwn}
                  <span class="req-actions">
                    {#if pr?.room}
                      <button class="btn-req accept" onclick={() => joinFriendRoom(pr.room)}>Rejoindre</button>
                    {:else}
                      <button class="btn-req" onclick={() => openInvite(f)}>Inviter</button>
                    {/if}
                  </span>
                {/if}
              </div>
            {/each}
          {:else}
            <p class="pv-empty" style="padding:20px">
              {#if isOwn}Tu n'as pas encore d'amis. Depuis le profil d'un joueur, clique sur «&nbsp;Ajouter en ami&nbsp;»&nbsp;: dès qu'il accepte, il apparaît ici.{:else}Aucun ami pour le moment.{/if}
            </p>
          {/if}
        </div>
      </section>
    {/if}

    </main>
  </div>
</div>

<InviteModal
  open={inviteOpen}
  onClose={() => { inviteOpen = false; }}
  {sb}
  {viewerId}
  targetId={inviteTarget?.id}
  targetName={inviteTarget?.username}
/>

<style>
  .pv {
    --pv-track: rgb(var(--c-glass) / 0.08);
    --pv-grid: rgb(var(--c-glass) / 0.06);
    --rail-w: 220px;
    position: relative;
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 clamp(16px, 4vw, 30px);
  }

  @keyframes pv-holo { to { background-position: 200% 0; } }
  @keyframes pv-drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(3%, -4%); } }
  @keyframes pv-strap { 0%, 100% { transform: translateX(-50%) rotate(2deg); } 50% { transform: translateX(-50%) rotate(-2deg); } }
  @keyframes pv-beam { 0%, 100% { transform: translateX(-50%) rotate(var(--a, 0deg)); opacity: .45; } 50% { transform: translateX(-50%) rotate(calc(var(--a, 0deg) + 6deg)); opacity: .85; } }
  @keyframes pv-mouse { 0%, 100% { transform: translateY(0); opacity: 1; } 50% { transform: translateY(6px); opacity: .4; } }
  @keyframes pv-namein { from { opacity: 0; transform: translateY(24px); clip-path: inset(0 100% 0 0); } to { opacity: 1; transform: translateY(0); clip-path: inset(0 0 0 0); } }

  /* Faisceaux de scène */
  .beams { position: absolute; inset: 0 0 auto 0; height: 620px; z-index: 0; pointer-events: none; overflow: hidden; }
  .beams i {
    position: absolute; top: -30%; left: 50%; width: clamp(160px, 24vw, 340px); height: 130%;
    transform-origin: top center; filter: blur(6px); mix-blend-mode: screen;
    background: linear-gradient(to bottom, rgb(var(--accent-rgb) / 0.14), transparent 62%);
    animation: pv-beam 9s ease-in-out infinite;
  }
  .beams i:nth-child(1) { --a: -22deg; left: 30%; }
  .beams i:nth-child(2) { --a: 14deg; left: 52%; animation-delay: -3s; }
  .beams i:nth-child(3) { --a: -6deg; left: 70%; animation-delay: -6s; }

  .pv > .marquee, .pv > .tour { position: relative; z-index: 1; }

  /* ═══ HERO ═══ */
  .marquee { padding: 30px 0 24px; }
  .marquee-top { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
  .marquee-top .rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--border2), transparent); }
  .eyebrow { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.72rem; letter-spacing: 0.3em; text-transform: uppercase; color: var(--dim); }
  .eyebrow b { color: var(--accent); }

  .marquee-grid { display: grid; grid-template-columns: 1fr; gap: 40px; align-items: center; }
  .identity { display: flex; align-items: center; gap: 20px; }
  .identity-av {
    width: 84px; height: 84px; border-radius: 50%;
    object-fit: cover; flex-shrink: 0;
    border: 2px solid var(--border2); background: var(--surface);
  }
  .name {
    font-family: "Barlow Condensed", sans-serif; font-weight: 900; text-transform: uppercase;
    line-height: 0.86; letter-spacing: -0.01em; font-size: clamp(34px, 7vw, 118px); overflow-wrap: anywhere; hyphens: auto;
    animation: pv-namein 0.7s cubic-bezier(.22,1,.36,1) both;
  }
  .name .pt { color: var(--accent); }
  .tagline { font-family: "Barlow Condensed", sans-serif; font-weight: 600; font-size: 1.05rem; letter-spacing: 0.04em; color: var(--mid); margin-top: 14px; text-transform: uppercase; }
  .tagline b { color: var(--text); }

  .headline-stats { display: flex; margin-top: 24px; border: 1px solid var(--border2); border-radius: var(--radius); overflow: hidden; width: fit-content; max-width: 100%; }
  .hs { padding: 14px 24px; border-right: 1px solid var(--border); }
  .hs:last-child { border-right: none; }
  .hs b { display: block; font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 1.6rem; line-height: 1; font-variant-numeric: tabular-nums; }
  .hs.max b { color: var(--accent); font-size: 1.9rem; }
  .hs.gold b { color: var(--gold); }
  .hs span { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--dim); margin-top: 5px; display: block; }

  .marquee-actions { margin-top: 24px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .btn {
    font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 0.95rem; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 11px 26px; border-radius: 99px; cursor: pointer; border: 1.5px solid var(--border2); background: none; color: var(--text); transition: all 0.15s;
  }
  .btn:hover { border-color: rgb(var(--c-glass) / 0.4); transform: translateY(-1px); }
  .btn-accent { background: var(--accent); border-color: var(--accent); color: var(--on-accent); box-shadow: 0 0 24px rgb(var(--accent-rgb) / 0.35); }
  .btn-accent:hover { box-shadow: 0 0 36px rgb(var(--accent-rgb) / 0.55); }
  .btn-following { border-color: rgb(var(--accent-rgb) / 0.6); color: var(--accent); background: rgb(var(--accent-rgb) / 0.08); }
  .btn-friend { border-color: rgb(var(--gold-rgb) / 0.6); color: var(--gold); background: rgb(var(--gold-rgb) / 0.08); }
  .btn:disabled { opacity: 0.55; cursor: default; }
  .follows-you { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dim); border: 1px solid var(--border2); border-radius: 99px; padding: 4px 10px; }

  /* Compteurs sociaux */
  .social-row { display: inline-flex; margin-top: 22px; border: 1px solid var(--border2); border-radius: 99px; overflow: hidden; max-width: 100%; }
  .social-cell { display: flex; align-items: baseline; gap: 7px; padding: 9px 20px; border-right: 1px solid var(--border); }
  .social-cell:last-child { border-right: none; }
  .social-cell b { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 1rem; font-variant-numeric: tabular-nums; }
  .social-cell.amis b { color: var(--gold); }
  .social-cell span { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.58rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--dim); }

  /* Guestlist */
  .gl { padding: 6px 0; }
  .gl-row { display: flex; align-items: center; gap: 12px; padding: 11px 20px; border-bottom: 1px solid var(--border); transition: background 0.15s, transform 0.15s; text-decoration: none; color: var(--text); }
  .gl-row:last-child { border-bottom: none; }
  .gl-row:hover { background: rgb(var(--c-glass) / 0.02); transform: translateX(3px); }
  .gl-av { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; overflow: hidden; border: 1px solid rgb(var(--accent-rgb) / 0.4); background: var(--surface); display: block; position: relative; }
  .gl-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .gl-av.gl-online { overflow: visible; }
  .gl-av.gl-online img { border-radius: 50%; }
  .gl-av.gl-online::after {
    content: ''; position: absolute; right: -2px; bottom: -2px; width: 10px; height: 10px;
    border-radius: 50%; background: var(--success); border: 2px solid var(--bg2);
    box-shadow: 0 0 8px rgb(74 222 128 / 0.55);
  }
  .gl-sub-live { color: var(--success) !important; }
  .gl-id { flex: 1; min-width: 0; }
  .gl-name { font-weight: 600; font-size: 0.88rem; }
  .gl-sub { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.58rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dim); margin-top: 1px; }
  .gl-elo { font-family: "JetBrains Mono", monospace; font-size: 0.72rem; color: var(--mid); flex-shrink: 0; }
  .gl-row > a { text-decoration: none; color: inherit; }
  .req-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .btn-req { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.66rem; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 12px; border-radius: 99px; cursor: pointer; border: 1.5px solid var(--border2); background: none; color: var(--mid); transition: all 0.15s; }
  .btn-req:hover { color: var(--text); border-color: rgb(var(--c-glass) / 0.4); }
  .btn-req.accept { border-color: var(--accent); color: var(--accent); background: rgb(var(--accent-rgb) / 0.08); }
  .btn-req:disabled { opacity: 0.55; cursor: default; }



  /* ═══ CORPS ═══ */
  .tour { display: grid; grid-template-columns: var(--rail-w) 1fr; gap: 40px; align-items: start; padding-bottom: 80px; }

  .program { display: flex; flex-direction: column; gap: 52px; min-width: 0; }
  .prog-block { opacity: 0; transform: translateY(18px); transition: opacity 0.6s cubic-bezier(.22,1,.36,1), transform 0.6s cubic-bezier(.22,1,.36,1); }
  .prog-block:global(.in) { opacity: 1; transform: translateY(0); }

  .block-head { display: flex; align-items: baseline; gap: 14px; margin-bottom: 18px; }
  .block-num { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1.1rem; color: var(--accent); letter-spacing: 0.05em; }
  .block-head h2 { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1.9rem; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1; }
  .block-head .sub { font-family: "JetBrains Mono", monospace; font-size: 0.64rem; color: var(--dim); text-transform: uppercase; letter-spacing: 0.06em; margin-left: auto; }
  .tape { display: inline-flex; align-items: center; gap: 8px; background: rgb(var(--gold-rgb, 251 191 36) / 0.08); border: 1px dashed rgb(var(--gold-rgb, 251 191 36) / 0.35); color: var(--gold); font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.64rem; letter-spacing: 0.24em; text-transform: uppercase; padding: 5px 12px; transform: rotate(-1deg); }

  .case {
    background-color: var(--bg2);
    background-image:
      radial-gradient(circle, rgb(var(--c-glass) / 0.22) 42%, transparent 45%), radial-gradient(circle, rgb(var(--c-glass) / 0.22) 42%, transparent 45%),
      radial-gradient(circle, rgb(var(--c-glass) / 0.22) 42%, transparent 45%), radial-gradient(circle, rgb(var(--c-glass) / 0.22) 42%, transparent 45%);
    background-repeat: no-repeat; background-size: 7px 7px;
    background-position: 9px 9px, calc(100% - 9px) 9px, 9px calc(100% - 9px), calc(100% - 9px) calc(100% - 9px);
    border: 1px solid var(--border2); border-radius: var(--radius);
  }
  .pv-empty { color: var(--dim); font-size: 0.85rem; padding: 8px 4px; }

  /* Rider */
  .rider-body { padding: 24px; }
  .mode-tabs { display: inline-flex; border: 1.5px solid var(--border2); border-radius: 99px; overflow: hidden; margin-bottom: 18px; }
  .mode-tabs button { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; background: none; border: none; border-right: 1px solid var(--border); color: var(--mid); padding: 8px 16px; cursor: pointer; }
  .mode-tabs button:last-child { border-right: none; }
  .mode-tabs button.on { color: var(--on-accent); background: var(--accent); }
  .mode-tabs button[data-mode="qcm"].on { background: var(--success); }
  .rider-top { display: flex; align-items: center; gap: 34px; flex-wrap: wrap; margin-bottom: 20px; }
  .dial { width: 210px; flex-shrink: 0; text-align: center; }
  .dial svg { width: 100%; display: block; overflow: visible; }
  .dial-read { margin-top: 10px; }
  .dial-read b { display: block; font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 2rem; line-height: 1; color: var(--accent); font-variant-numeric: tabular-nums; }
  .dial-read span { display: block; font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.6rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--dim); margin-top: 7px; }
  .dial-side { flex: 1; min-width: 220px; }
  .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
  .kv-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px dotted var(--border2); }
  .kv-row .k { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.66rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
  .kv-row .v { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 0.92rem; font-variant-numeric: tabular-nums; }

  .power { margin-top: 6px; }
  .power-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  .power-top .lv { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 0.95rem; letter-spacing: 0.08em; text-transform: uppercase; }
  .power-top .lv b { color: var(--accent); }
  .power-top .xp { font-family: "JetBrains Mono", monospace; font-size: 0.68rem; color: var(--mid); }
  .power-bar { height: 11px; border-radius: 2px; background: rgb(var(--c-glass) / 0.06); display: flex; gap: 2px; padding: 2px; }
  .power-bar i { flex: 1; border-radius: 1px; background: rgb(var(--c-glass) / 0.06); transition: background 0.4s ease; }
  .power-bar i.on { background: linear-gradient(180deg, var(--accent), var(--accent2)); box-shadow: 0 0 6px rgb(var(--accent-rgb) / 0.5); }

  .form-wrap { padding: 20px 24px 16px; margin-top: 16px; }
  .form-wrap svg { width: 100%; height: auto; display: block; }
  .form-range { color: var(--mid); }
  .form-caption { display: flex; justify-content: space-between; font-family: "JetBrains Mono", monospace; font-size: 0.6rem; color: var(--dim); margin-top: 4px; }

  /* Itinéraire */
  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
  .tour-map { padding: 22px 26px; position: relative; }
  .tour-line { position: absolute; left: 38px; top: 40px; bottom: 40px; width: 2px; background: var(--border2); }
  .tour-stop { display: flex; align-items: center; gap: 18px; padding: 11px 0; position: relative; z-index: 1; }
  .tour-dot { width: 16px; height: 16px; border-radius: 50%; background: var(--bg2); border: 2px solid var(--accent); flex-shrink: 0; margin-left: 6px; box-shadow: 0 0 0 4px var(--bg2); }
  .tour-stop:first-child .tour-dot { background: var(--accent); box-shadow: 0 0 0 4px var(--bg2), 0 0 14px rgb(var(--accent-rgb) / 0.6); }
  .tour-city { flex: 1; min-width: 0; }
  .tour-city b { font-weight: 600; font-size: 0.92rem; }
  .tour-city small { display: block; font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.58rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dim); margin-top: 2px; }
  .tour-score { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 1rem; color: var(--accent); }

  .tiers { padding: 22px 24px; }
  .tier-bar { display: flex; gap: 3px; height: 10px; border-radius: 2px; overflow: hidden; margin-bottom: 18px; }
  .tier-bar i { display: block; height: 100%; }
  .tier-row { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-bottom: 1px dashed var(--border); font-size: 0.82rem; }
  .tier-row:last-child { border-bottom: none; padding-bottom: 0; }
  .tier-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .tier-name { flex: 1; color: var(--mid); }
  .tier-count { font-family: "JetBrains Mono", monospace; font-size: 0.66rem; color: var(--dim); }
  .tier-pts { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 0.78rem; }

  /* Carnet */
  .log { padding: 6px 0 4px; }
  .log-head { display: grid; grid-template-columns: 40px 1fr 100px 100px 80px 60px; gap: 12px; padding: 10px 20px; border-bottom: 1px solid var(--border2); font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.58rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--dim); }
  .log-row { display: grid; grid-template-columns: 40px 1fr 100px 100px 80px 60px; gap: 12px; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--border); position: relative; }
  .log-row:last-child { border-bottom: none; }
  .log-row::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; }
  .log-row.cl::before { background: var(--accent); }
  .log-row.qcm::before { background: var(--success); }
  .log-num { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1rem; color: var(--dim); }
  .log-room { font-weight: 600; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .log-mode { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.66rem; letter-spacing: 0.14em; text-transform: uppercase; }
  .log-mode.m-cl { color: var(--accent); }
  .log-mode.m-qcm { color: var(--success); }
  .log-date { font-family: "JetBrains Mono", monospace; font-size: 0.68rem; color: var(--mid); }
  .log-score { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 0.85rem; text-align: right; }
  .log-rank { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 0.82rem; text-align: right; color: var(--mid); }
  .log-rank.r1 { color: var(--gold); }

  @media (prefers-reduced-motion: reduce) {
    .prog-block { transition: none; opacity: 1; transform: none; }
    .beams i, .name { animation: none !important; }
  }

  @media (max-width: 1000px) {
    .marquee-grid { grid-template-columns: 1fr; gap: 28px; }
    .tour { grid-template-columns: 1fr; gap: 0; }
  }
  @media (max-width: 640px) {
    .kv { grid-template-columns: 1fr; }
    .split { grid-template-columns: 1fr; }
    .headline-stats { width: 100%; display: grid; grid-template-columns: 1fr 1fr; }
    .hs { padding: 12px 14px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); min-width: 0; }
    .hs:nth-child(2n) { border-right: none; }
    .hs:nth-child(n + 3) { border-bottom: none; }
    .hs b, .hs.max b { font-size: 1.5rem; }
    .social-row { display: flex; width: 100%; }
    .social-cell { flex: 1; flex-direction: column; align-items: center; gap: 2px; padding: 9px 6px; text-align: center; }
    .social-cell span { font-size: 0.54rem; letter-spacing: 0.1em; }
    .log-head { display: none; }
    .log-row { grid-template-columns: 1fr 64px; }
    .log-num, .log-mode, .log-date, .log-rank { display: none; }
    .rider-top { flex-direction: column; gap: 20px; }
    .dial { align-self: center; }
    .dial-side { width: 100%; min-width: 0; }
    .block-head { flex-wrap: wrap; }
    .block-head .sub { margin-left: 0; }
  }
</style>
