<script>
  import NotifyPrompt from '$lib/components/notify/NotifyPrompt.svelte';
  import { dicebear } from '$lib/shared/utils.js';
  import {
    fmtScore, fmtSince, pct,
    xpForNextLevel, xpPercent,
    buildCurve, buildItinerary, rangOrdinal, rangDetail,
  } from '$lib/shared/profile/stats.js';
  import AchievementsPanel from '$lib/components/achievements/AchievementsPanel.svelte';
  import InviteModal from '$lib/components/profile/InviteModal.svelte';
  import ProfileSummary from '$lib/components/profile/ProfileSummary.svelte';
  import ProfileSection from '$lib/components/profile/ProfileSection.svelte';
  import SectionHistory from '$lib/components/profile/SectionHistory.svelte';
  import SectionFriends from '$lib/components/profile/SectionFriends.svelte';
  import SectionBestScores from '$lib/components/profile/SectionBestScores.svelte';
  import SectionCards from '$lib/components/profile/SectionCards.svelte';
  import CardViewer from '$lib/components/card/CardViewer.svelte';
  import SectionPerformances from '$lib/components/profile/SectionPerformances.svelte';
  import ProfileHeader from '$lib/components/profile/ProfileHeader.svelte';
  import { ProfileSocial } from './profileSocial.svelte.js';

  let { profile, stats, sb, userId, viewerId = null, editable = false, onEdit = () => {}, onReport = null } = $props();

  const isOwn = $derived(viewerId != null && viewerId === profile?.id);
  const canFollow = $derived(viewerId != null && !isOwn);

  // ── Données sociales (abonnés / abonnements / amis) ──
  const s = new ProfileSocial(() => ({ sb, profileId: profile?.id, viewerId, isOwn, canFollow }));

  $effect(() => {
    if (profile?.id) s.load();
  });

  let mode = $state('classic');
  const isQcm = $derived(mode === 'qcm');
  const m = $derived(isQcm ? stats?.qcm : stats);

  const name   = $derived(profile?.username || 'Joueur');
  const avatar = $derived(profile?.avatar_url || dicebear(name));

  const lvl = $derived(profile?.level ?? 1);
  const xpMax = $derived(xpForNextLevel(lvl));
  const xpPct = $derived(xpPercent(profile?.xp, lvl));

  // Cadran ELO : ratio sur une plage 800→2200
  const elo = $derived(profile?.elo ?? 0);

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

  // Carnet de route (historique classique + QCM fusionnés)
  const carnet = $derived(
    [
      ...(stats?.recentGames ?? []).map(g => ({ ...g, gmode: 'cl' })),
      ...(stats?.qcm?.recentGames ?? []).map(g => ({ ...g, gmode: 'qcm' })),
    ]
      .sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt))
      .slice(0, 6)
  );

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
    { id: 'cards', t: 'Cartes', quand: () => !!profile?.username },
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
  <ProfileHeader
    nom={name} {avatar} niveau={lvl} {elo}
    membreDepuis={profile?.created_at ? fmtSince(profile.created_at) : ''}
    parties={profile?.games_played ?? total ?? 0}
    scoreTotal={fmtScore(profile?.total_score ?? m?.totalScore ?? 0)}
    podiumsPct={pct(podiums, total)}
    {ordinal} {detailRang} social={s.social} presence={s.presenceMap} profilId={profile?.id}
    estLeSien={editable || isOwn} peutSuivre={canFollow}
    followBusy={s.followBusy} friendBusy={s.friendBusy}
    {onEdit} {onReport}
    onFriendAction={s.friendAction}
    onToggleFollow={s.toggleFollow}
    onJoinRoom={s.joinFriendRoom}
    onInvite={s.openInvite}
  />

  <!-- ═══ CORPS ═══ -->
  <div class="tour">
    <ProfileSummary {sections} active={activeSection} onGoTo={goTo} />

    <main class="program">

      <!-- 01 RIDER -->
    {#if visible.has('rider')}
      <ProfileSection id="rider" num={numDe('rider')} titre="Performances" sub={isQcm ? 'Mode QCM' : 'Mode classique'}>
        <SectionPerformances
          {elo} niveau={lvl} xp={profile?.xp ?? 0} {xpMax} {xpPct}
          valeurs={riderStats} courbe={curve} nbRecentes={recent.length}
          qcm={isQcm} onMode={(m) => (mode = m)}
        />
      </ProfileSection>
    {/if}
    {#if visible.has('tour')}
      <ProfileSection id="tour" num={numDe('tour')} titre="Meilleurs scores" sub="Par room officielle">
        <SectionBestScores itineraire={itinerary} parType={byType} />
      </ProfileSection>
    {/if}
    {#if visible.has('log')}
      <ProfileSection id="log" num={numDe('log')} titre="Dernières parties" sub={`${carnet.length} dernière${carnet.length > 1 ? 's' : ''}`}>
        <SectionHistory parties={carnet} />
      </ProfileSection>
    {/if}
    {#if visible.has('case')}
      <ProfileSection id="case" num={numDe('case')} titre="Badges" sub="Succès &amp; séries">
        <AchievementsPanel {sb} {userId} />
      </ProfileSection>
    {/if}
    {#if visible.has('cards')}
      <ProfileSection id="cards" num={numDe('cards')} titre="Cartes" sub="Collection">
        {#if isOwn}
          <NotifyPrompt
            categories={['cards']}
            title="Suis ta collection"
            text="Prévenu quand une de tes cartes monte en rareté, qu'un ami décroche une Mythique ou qu'il te manque une carte pour finir un set."
          />
        {/if}
        <SectionCards username={profile.username} {sb} />
      </ProfileSection>
    {/if}
    {#if visible.has('guests')}
      <ProfileSection id="guests" num={numDe('guests')} titre="Amis" sub={`${s.social.friendsCount} ami${s.social.friendsCount > 1 ? 's' : ''}`}>
        <SectionFriends
          social={s.social} presenceMap={s.presenceMap} {isOwn} friendBusy={s.friendBusy}
          onFriendAction={s.friendAction}
          onJoinRoom={s.joinFriendRoom}
          onInvite={s.openInvite}
        />
      </ProfileSection>
    {/if}

    </main>
  </div>
</div>

<CardViewer />

<InviteModal
  open={s.inviteOpen}
  onClose={() => { s.inviteOpen = false; }}
  {sb}
  {viewerId}
  targetId={s.inviteTarget?.id}
  targetName={s.inviteTarget?.username}
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

  @keyframes pv-beam { 0%, 100% { transform: translateX(-50%) rotate(var(--a, 0deg)); opacity: .45; } 50% { transform: translateX(-50%) rotate(calc(var(--a, 0deg) + 6deg)); opacity: .85; } }

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

  /* .marquee est la racine de ProfileHeader : hors de portée du scope. */
  :global(.pv > .marquee) { position: relative; z-index: 1; }
  .pv > .tour { position: relative; z-index: 1; }

  /* ═══ CORPS ═══ */
  .tour { display: grid; grid-template-columns: var(--rail-w) 1fr; gap: 40px; align-items: start; padding-bottom: 80px; }

  .program { display: flex; flex-direction: column; gap: 52px; min-width: 0; }

  :global(.pv .tape) { display: inline-flex; align-items: center; gap: 8px; background: rgb(var(--gold-rgb, 251 191 36) / 0.08); border: 1px dashed rgb(var(--gold-rgb, 251 191 36) / 0.35); color: var(--gold); font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.64rem; letter-spacing: 0.24em; text-transform: uppercase; padding: 5px 12px; transform: rotate(-1deg); }

  :global(.pv .eyebrow) { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.72rem; letter-spacing: 0.3em; text-transform: uppercase; color: var(--dim); }
  :global(.pv .eyebrow b) { color: var(--accent); }

  :global(.pv .case) {
    background-color: var(--bg2);
    background-image:
      radial-gradient(circle, rgb(var(--c-glass) / 0.22) 42%, transparent 45%), radial-gradient(circle, rgb(var(--c-glass) / 0.22) 42%, transparent 45%),
      radial-gradient(circle, rgb(var(--c-glass) / 0.22) 42%, transparent 45%), radial-gradient(circle, rgb(var(--c-glass) / 0.22) 42%, transparent 45%);
    background-repeat: no-repeat; background-size: 7px 7px;
    background-position: 9px 9px, calc(100% - 9px) 9px, 9px calc(100% - 9px), calc(100% - 9px) calc(100% - 9px);
    border: 1px solid var(--border2); border-radius: var(--radius);
  }
  :global(.pv .pv-empty) { color: var(--dim); font-size: 0.85rem; padding: 8px 4px; }


  @media (prefers-reduced-motion: reduce) {
    .beams i { animation: none !important; }
  }

  @media (max-width: 1000px) {
    .tour { grid-template-columns: 1fr; gap: 0; }
  }
</style>
