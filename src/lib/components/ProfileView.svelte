<script>
  import { dicebear } from '$lib/utils.js';
  import AchievementsPanel from '$lib/components/AchievementsPanel.svelte';

  let { profile, stats, sb, userId, viewerId = null, editable = false, onEdit = () => {} } = $props();

  const isOwn = $derived(viewerId != null && viewerId === profile?.id);
  const canFollow = $derived(viewerId != null && !isOwn);

  // ── Données sociales (abonnés / abonnements / amis) ──
  let social = $state({ followers: 0, following: 0, friendsCount: 0, friends: [], viewerFollows: false, followsViewer: false, isFriend: false });
  let followBusy = $state(false);

  async function loadSocial() {
    if (!sb || !profile?.id) return;
    try {
      const token = (await sb.auth.getSession())?.data?.session?.access_token;
      const r = await fetch(`/api/social/${profile.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (r.ok) social = await r.json();
    } catch { /* réseau indisponible */ }
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

  $effect(() => {
    if (profile?.id) loadSocial();
  });

  let mode = $state('classic');
  const isQcm = $derived(mode === 'qcm');
  const m = $derived(isQcm ? stats?.qcm : stats);

  const name   = $derived(profile?.username || 'Joueur');
  const avatar = $derived(profile?.avatar_url || dicebear(name));

  function fmtSince(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  function fmtScore(n) {
    if (n == null) return '—';
    if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
    return String(n);
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso), now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return `Auj. ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    if (diff === 1) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  // XP / niveau (mêmes formules que le serveur)
  function xpForLevel(lvl) { return Math.round(50 * Math.pow(Math.max(0, lvl - 1), 2.5)); }
  function xpForNextLevel(lvl) { return Math.round(50 * Math.pow(lvl, 2.5)); }
  const lvl = $derived(profile?.level ?? 1);
  const xpMax = $derived(xpForNextLevel(lvl));
  const xpPct = $derived(Math.min(100, Math.round(((profile?.xp ?? 0) - xpForLevel(lvl)) / (xpMax - xpForLevel(lvl)) * 100)));
  const powerSegs = 26;
  const powerOn = $derived(Math.round(powerSegs * xpPct / 100));

  // Cadran ELO : ratio sur une plage 800→2200
  const elo = $derived(profile?.elo ?? 0);
  const eloRatio = $derived(Math.max(0, Math.min(1, (elo - 800) / 1400)));
  const dialCirc = 311;
  const dialOffset = $derived(dialCirc * (1 - eloRatio));
  const dialAngle = $derived(-90 + eloRatio * 180);

  // Stats du rider selon le mode
  const total   = $derived(m?.winRate?.total ?? 0);
  const wins    = $derived(m?.winRate?.wins ?? 0);
  const podiums = $derived(m?.podiums ?? 0);
  const avg     = $derived(total > 0 ? Math.round((m?.totalScore ?? 0) / total) : 0);
  const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

  const riderStats = $derived([
    { k: 'Parties jouées', v: total || '—' },
    { k: 'Meilleur score', v: fmtScore(m?.bestScore ?? 0) },
    { k: 'Score total', v: fmtScore(m?.totalScore ?? 0) },
    { k: 'Score moyen', v: avg || '—' },
    { k: 'Taux de podium', v: `${pct(podiums, total)}%` },
    { k: '1ères places', v: `${pct(wins, total)}% · ${wins}` },
    { k: 'Pire score', v: total > 0 ? (m?.worstScore ?? '—') : '—' },
    { k: 'Ce mois', v: `${m?.gamesThisMonth ?? 0} parties` },
  ]);

  // Courbe de forme
  const recent = $derived(m?.recentGames ?? []);
  const curve = $derived(buildCurve(recent));
  function buildCurve(games) {
    if (!games?.length) return { line: '', area: '', last: null, min: 0, max: 0 };
    const pts = [...games].reverse().map(g => g.score);
    const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
    const W = 640, H = 130, pad = 14;
    const coords = pts.map((s, i) => {
      const x = pts.length === 1 ? W / 2 : (i / (pts.length - 1)) * W;
      const y = pad + (1 - (s - min) / range) * (H - pad * 2);
      return [x, y];
    });
    const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} ${W},${H} 0,${H}`;
    return { line, area, last: coords[coords.length - 1], min, max, lastScore: pts[pts.length - 1] };
  }

  // Itinéraire (meilleurs scores par room officielle)
  const itinerary = $derived(
    Object.entries(m?.bestByRoom ?? {})
      .map(([code, score]) => ({ room: m?.roomInfo?.[code], score }))
      .filter(e => e.room)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  );

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

  const rank = $derived(stats?.rank);
  const classementValue = $derived(rank != null ? `#${rank}` : null);

  // Nav setlist
  const sections = [
    { id: 'rider', n: '01', t: 'Statistiques' },
    { id: 'tour', n: '02', t: 'Meilleurs scores' },
    { id: 'guests', n: '03', t: 'Amis' },
    { id: 'case', n: '04', t: 'Badges' },
    { id: 'log', n: '05', t: 'Historique' },
  ];
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

  // Tilt 3D du pass
  let passEl = $state(null);
  function tilt(e) {
    if (!passEl) return;
    const r = passEl.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    passEl.style.transform = `rotateY(${px * 16}deg) rotateX(${-py * 16}deg) translateY(-6px)`;
  }
  function untilt() { if (passEl) passEl.style.transform = ''; }
</script>

<div class="pv">
  <div class="beams" aria-hidden="true"><i></i><i></i><i></i></div>

  <!-- ═══ HERO AFFICHE ═══ -->
  <header class="marquee">
    <div class="marquee-top">
      <span class="eyebrow">ZIK · <b>Profil artiste</b></span>
      <span class="rule"></span>
      <span class="eyebrow">Niveau {lvl}</span>
    </div>

    <div class="marquee-grid">
      <div class="headliner">
        {#if classementValue}<span class="kicker">★ {classementValue} au classement</span>{/if}
        <h1 class="name">{name}<span class="pt">.</span></h1>
        <div class="tagline">
          {#if profile?.created_at}Membre depuis {fmtSince(profile.created_at)} · {/if}
          <b>{profile?.games_played ?? total ?? 0} parties jouées</b>
        </div>

        <div class="headline-stats">
          <div class="hs max"><b>{elo || '—'}</b><span>ELO</span></div>
          <div class="hs"><b>{fmtScore(profile?.total_score ?? m?.totalScore ?? 0)}</b><span>Score total</span></div>
          <div class="hs"><b>{pct(podiums, total)}%</b><span>Podiums</span></div>
          {#if classementValue}<div class="hs gold"><b>{classementValue}</b><span>Classement</span></div>{/if}
        </div>

        <div class="social-row">
          <div class="social-cell"><b>{social.followers}</b><span>Abonnés</span></div>
          <div class="social-cell"><b>{social.following}</b><span>Abonnements</span></div>
          <div class="social-cell amis"><b>{social.friendsCount}</b><span>Amis</span></div>
        </div>

        <div class="marquee-actions">
          {#if social.isFriend}<span class="tag-ami-line">★ Vous êtes amis</span>{/if}
          {#if editable || isOwn}
            <button class="btn btn-accent" onclick={onEdit}>Modifier le pass</button>
          {:else if canFollow}
            <button class="btn" class:btn-friend={social.isFriend} class:btn-following={social.viewerFollows && !social.isFriend} onclick={toggleFollow} disabled={followBusy}>
              {social.isFriend ? '★ Ami' : social.viewerFollows ? '✓ Suivi' : '+ Suivre'}
            </button>
            {#if social.followsViewer && !social.viewerFollows}<span class="follows-you">Vous suit</span>{/if}
          {/if}
        </div>

        <div class="scroll-hint"><span class="arw"></span> Faire défiler</div>
      </div>

      <div class="pass-wrap" role="presentation" onmousemove={tilt} onmouseleave={untilt}>
        <div class="pass-strap"></div>
        <div class="pass" bind:this={passEl}>
          <div class="pass-hole"></div>
          <div class="pass-holo"></div>
          <div class="pass-tour">ZIK World Tour · 2026</div>
          <div class="pass-av-row">
            <img class="pass-av" src={avatar} alt="" width="70" height="70">
            <div class="pass-nm">{name}<span class="pt">.</span></div>
          </div>
          <div class="pass-since">Niveau {lvl}{#if profile?.created_at} · depuis {fmtSince(profile.created_at)}{/if}</div>
          <div class="pass-access">★ Access all areas ★</div>
          <div class="pass-barcode"></div>
          <div class="pass-code">ZIK · ELO {elo || '—'}</div>
        </div>
      </div>
    </div>
  </header>

  <!-- ═══ CORPS ═══ -->
  <div class="tour">
    <aside class="rail">
      <div class="rail-card">
        <div class="rail-lbl">Sommaire</div>
        <nav class="rail-nav">
          {#each sections as s (s.id)}
            <button class="rail-link" class:active={activeSection === s.id} onclick={() => goTo(s.id)}>
              <span class="n">{s.n}</span><span class="t">{s.t}</span>
            </button>
          {/each}
        </nav>
      </div>
    </aside>

    <main class="program">

      <!-- 01 RIDER -->
      <section class="prog-block" id="pv-rider" use:reveal>
        <div class="block-head">
          <span class="block-num">01</span>
          <h2>Statistiques</h2>
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
            <div class="power-top"><span class="lv">Niveau <b>{lvl}</b> → {lvl + 1}</span><span class="xp">{profile?.xp ?? 0} / {xpMax} XP</span></div>
            <div class="power-bar">
              {#each Array(powerSegs), i (i)}<i class:on={i < powerOn}></i>{/each}
            </div>
          </div>
        </div>

        {#if curve.line}
          <div class="case form-wrap">
            <div class="eyebrow" style="margin-bottom:6px">Courbe de forme · <b>{recent.length} dernières</b></div>
            <svg viewBox="0 0 640 130" preserveAspectRatio="none" aria-hidden="true">
              <line x1="0" y1="30" x2="640" y2="30" stroke="var(--pv-grid)"/>
              <line x1="0" y1="80" x2="640" y2="80" stroke="var(--pv-grid)"/>
              <defs><linearGradient id="pvfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgb(var(--accent-rgb) / 0.28)"/><stop offset="100%" stop-color="rgb(var(--accent-rgb) / 0)"/></linearGradient></defs>
              <polygon points={curve.area} fill="url(#pvfg)"/>
              <polyline points={curve.line} fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
              {#if curve.last}<circle cx={curve.last[0]} cy={curve.last[1]} r="4.5" fill="var(--accent)"/>{/if}
            </svg>
            <div class="form-caption"><span>plus ancien</span><span>récent · {curve.lastScore} pts</span></div>
          </div>
        {/if}
      </section>

      <!-- 02 ITINÉRAIRE -->
      <section class="prog-block" id="pv-tour" use:reveal>
        <div class="block-head">
          <span class="block-num">02</span>
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
                <div class="tier-row"><span class="tier-chip" style="background:var(--accent)">VIP</span><span class="tier-name">Rooms officielles</span><span class="tier-count">{byType.official.count}</span><span class="tier-pts">{fmtScore(byType.official.totalScore)} pts</span></div>
                <div class="tier-row"><span class="tier-chip" style="background:rgb(var(--accent-rgb) / 0.6)">Backstage</span><span class="tier-name">Rooms publiques</span><span class="tier-count">{byType.public.count}</span><span class="tier-pts">{fmtScore(byType.public.totalScore)} pts</span></div>
                <div class="tier-row"><span class="tier-chip" style="background:rgb(var(--accent-rgb) / 0.3)">General</span><span class="tier-name">Rooms privées</span><span class="tier-count">{byType.private.count}</span><span class="tier-pts">{fmtScore(byType.private.totalScore)} pts</span></div>
              {:else}
                <p class="pv-empty">Aucune partie jouée.</p>
              {/if}
            </div>
          </div>
        </div>
      </section>

      <!-- 03 GUESTLIST -->
      <section class="prog-block" id="pv-guests" use:reveal>
        <div class="block-head">
          <span class="block-num">03</span>
          <h2>Amis</h2>
          <span class="sub">{social.friendsCount} ami{social.friendsCount > 1 ? 's' : ''}</span>
        </div>
        <div class="case gl">
          {#if social.friends.length}
            {#each social.friends as f (f.id)}
              <a class="gl-row" href="/user/{f.username}">
                <span class="gl-av"><img src={f.avatar_url || dicebear(f.username)} alt="" width="34" height="34"></span>
                <div class="gl-id"><div class="gl-name">{f.username}</div><div class="gl-sub">Niveau {f.level ?? 1}</div></div>
                <span class="gl-elo">{f.elo ?? '—'} ELO</span>
              </a>
            {/each}
          {:else}
            <p class="pv-empty" style="padding:20px">
              {#if isOwn}Tu n'as pas encore d'amis. Suis des joueurs depuis leur profil&nbsp;: dès qu'ils te suivent en retour, ils rejoignent ta guestlist.{:else}Aucun ami pour le moment.{/if}
            </p>
          {/if}
        </div>
      </section>

      <!-- 04 FLIGHT CASE -->
      <section class="prog-block" id="pv-case" use:reveal>
        <div class="block-head">
          <span class="block-num">04</span>
          <h2>Badges</h2>
          <span class="sub">Succès & séries</span>
        </div>
        <AchievementsPanel {sb} {userId} />
      </section>

      <!-- 05 CARNET -->
      <section class="prog-block" id="pv-log" use:reveal>
        <div class="block-head">
          <span class="block-num">05</span>
          <h2>Historique</h2>
          <span class="sub">Dernières parties</span>
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

    </main>
  </div>
</div>

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
  @keyframes pv-drop {
    0% { transform: translateY(-140px) rotate(-14deg); opacity: 0; }
    60% { transform: translateY(8px) rotate(-1deg); opacity: 1; }
    100% { transform: translateY(0) rotate(-2.5deg); opacity: 1; }
  }
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

  .marquee-grid { display: grid; grid-template-columns: 1fr 320px; gap: 40px; align-items: center; }
  .kicker {
    display: inline-flex; align-items: center; gap: 9px;
    font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.74rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold);
    border: 1px solid rgb(var(--gold-rgb, 251 191 36) / 0.3); border-radius: 99px; padding: 5px 14px; margin-bottom: 14px;
  }
  .name {
    font-family: "Barlow Condensed", sans-serif; font-weight: 900; text-transform: uppercase;
    line-height: 0.86; letter-spacing: -0.01em; font-size: clamp(48px, 8vw, 118px); word-break: break-word;
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

  .marquee-actions { margin-top: 24px; }
  .btn {
    font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 0.95rem; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 11px 26px; border-radius: 99px; cursor: pointer; border: 1.5px solid var(--border2); background: none; color: var(--text); transition: all 0.15s;
  }
  .btn:hover { border-color: rgb(var(--c-glass) / 0.4); transform: translateY(-1px); }
  .btn-accent { background: var(--accent); border-color: var(--accent); color: #000; box-shadow: 0 0 24px rgb(var(--accent-rgb) / 0.35); }
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
  .tag-ami-line { display: inline-flex; align-items: center; gap: 7px; font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.74rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); }

  /* Guestlist */
  .gl { padding: 6px 0; }
  .gl-row { display: flex; align-items: center; gap: 12px; padding: 11px 20px; border-bottom: 1px solid var(--border); transition: background 0.15s, transform 0.15s; text-decoration: none; color: var(--text); }
  .gl-row:last-child { border-bottom: none; }
  .gl-row:hover { background: rgb(var(--c-glass) / 0.02); transform: translateX(3px); }
  .gl-av { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; overflow: hidden; border: 1px solid rgb(var(--accent-rgb) / 0.4); background: var(--surface); display: block; }
  .gl-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .gl-id { flex: 1; min-width: 0; }
  .gl-name { font-weight: 600; font-size: 0.88rem; }
  .gl-sub { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.58rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dim); margin-top: 1px; }
  .gl-elo { font-family: "JetBrains Mono", monospace; font-size: 0.72rem; color: var(--mid); flex-shrink: 0; }

  .scroll-hint { display: flex; align-items: center; gap: 9px; margin-top: 30px; font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.66rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--dim); }
  .scroll-hint .arw { position: relative; display: inline-block; width: 16px; height: 26px; border: 1.5px solid var(--dim); border-radius: 9px; flex-shrink: 0; }
  .scroll-hint .arw::after { content: ''; position: absolute; left: 0; right: 0; top: 5px; margin: 0 auto; width: 3px; height: 6px; border-radius: 2px; background: var(--accent); animation: pv-mouse 1.6s ease-in-out infinite; }

  /* Le pass */
  .pass-wrap { position: relative; perspective: 1000px; justify-self: center; width: min(320px, 100%); }
  .pass-strap { position: absolute; top: -46px; left: 50%; width: 30px; height: 62px; z-index: 0; background: repeating-linear-gradient(0deg, var(--accent) 0 11px, var(--accent2) 11px 14px); animation: pv-strap 4.5s ease-in-out infinite; transform-origin: top center; }
  .pass {
    position: relative; z-index: 1; width: min(320px, 100%); border-radius: 15px; transform-style: preserve-3d;
    background: linear-gradient(160deg, var(--surface3), var(--bg2) 62%); border: 1px solid var(--border2);
    box-shadow: 0 34px 80px rgba(0,0,0,0.55), inset 0 0 0 1px rgb(var(--c-glass) / 0.04);
    padding: 46px 24px 22px; overflow: hidden; transition: transform 0.25s cubic-bezier(.22,1,.36,1);
    animation: pv-drop 1s cubic-bezier(.22,1,.36,1) both; will-change: transform;
  }
  .pass::before { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 40%, rgb(var(--c-glass) / 0.1) 47%, transparent 56%); pointer-events: none; }
  .pass-hole { position: absolute; top: 15px; left: 50%; transform: translateX(-50%); width: 52px; height: 11px; border-radius: 6px; background: var(--bg); box-shadow: inset 0 1px 3px rgba(0,0,0,0.6), 0 0 0 1px rgb(var(--c-glass) / 0.12); }
  .pass-holo { height: 9px; border-radius: 5px; margin-bottom: 16px; background: linear-gradient(90deg, #ff00ff, #4ade80, #38bdf8, #fbbf24, #ff00ff, #ff00ff, #4ade80, #38bdf8, #fbbf24, #ff00ff); background-size: 200% 100%; opacity: 0.78; animation: pv-holo 5s linear infinite; }
  .pass-tour { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.6rem; letter-spacing: 0.3em; text-transform: uppercase; color: var(--accent); }
  .pass-av-row { display: flex; align-items: center; gap: 14px; margin-top: 6px; }
  .pass-av { width: 70px; height: 70px; border-radius: 9px; flex-shrink: 0; object-fit: cover; border: 1px solid var(--border2); background: var(--surface); }
  .pass-nm { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1.5rem; text-transform: uppercase; line-height: 0.95; word-break: break-word; }
  .pass-nm .pt { color: var(--accent); }
  .pass-since { font-family: "JetBrains Mono", monospace; font-size: 0.58rem; color: var(--mid); margin-top: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
  .pass-access { margin-top: 15px; text-align: center; background: var(--accent); color: #000; border-radius: 4px; font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 0.98rem; letter-spacing: 0.2em; text-transform: uppercase; padding: 8px 0; }
  .pass-barcode { margin-top: 15px; height: 34px; border-radius: 2px; background: repeating-linear-gradient(90deg, var(--text) 0 2px, transparent 2px 5px, var(--text) 5px 6px, transparent 6px 11px, var(--text) 11px 14px, transparent 14px 17px); opacity: 0.7; }
  .pass-code { font-family: "JetBrains Mono", monospace; font-size: 0.56rem; color: var(--dim); text-align: center; margin-top: 6px; letter-spacing: 0.24em; }

  /* ═══ CORPS ═══ */
  .tour { display: grid; grid-template-columns: var(--rail-w) 1fr; gap: 40px; align-items: start; padding-bottom: 80px; }
  .rail { position: sticky; top: calc(var(--nav-h) + 16px); }
  .rail-card { border: 1px solid var(--border2); border-radius: var(--radius); background: var(--bg2); padding: 14px; }
  .rail-lbl { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.58rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--dim); padding: 0 4px 12px; }
  .rail-nav { display: flex; flex-direction: column; }
  .rail-link { display: flex; align-items: center; gap: 11px; padding: 9px 8px; border-radius: var(--radius); background: none; border: none; border-left: 2px solid transparent; color: var(--mid); cursor: pointer; transition: all 0.18s; text-align: left; font-family: inherit; }
  .rail-link .n { font-family: "JetBrains Mono", monospace; font-size: 0.62rem; color: var(--dim); width: 18px; }
  .rail-link .t { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.86rem; letter-spacing: 0.06em; text-transform: uppercase; }
  .rail-link:hover { color: var(--text); background: rgb(var(--c-glass) / 0.03); }
  .rail-link.active { color: var(--accent); border-left-color: var(--accent); background: rgb(var(--accent-rgb) / 0.07); }
  .rail-link.active .n { color: var(--accent); }

  .program { display: flex; flex-direction: column; gap: 52px; min-width: 0; }
  .prog-block { opacity: 0; transform: translateY(18px); transition: opacity 0.6s cubic-bezier(.22,1,.36,1), transform 0.6s cubic-bezier(.22,1,.36,1); }
  .prog-block:global(.in) { opacity: 1; transform: translateY(0); }

  .block-head { display: flex; align-items: baseline; gap: 14px; margin-bottom: 18px; }
  .block-num { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1.1rem; color: var(--accent); letter-spacing: 0.05em; }
  .block-head h2 { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1.9rem; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1; }
  .block-head .sub { font-family: "JetBrains Mono", monospace; font-size: 0.64rem; color: var(--dim); text-transform: uppercase; letter-spacing: 0.06em; margin-left: auto; }
  .block-head .tape { margin-left: auto; }
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
  .mode-tabs button.on { color: #000; background: var(--accent); }
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
  .tier-chip { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 8px; border-radius: 3px; color: #000; flex-shrink: 0; }
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
    .beams i, .pass-holo, .pass-strap, .pass, .name, .scroll-hint .arw::after { animation: none !important; }
  }

  @media (max-width: 1000px) {
    .marquee-grid { grid-template-columns: 1fr; gap: 28px; }
    .pass-wrap { justify-self: start; }
    .tour { grid-template-columns: 1fr; gap: 0; }
    .rail { position: static; margin-bottom: 36px; }
    .rail-nav { flex-direction: row; flex-wrap: wrap; }
    .rail-link { border-left: none; border-bottom: 2px solid transparent; }
    .rail-link.active { border-left: none; border-bottom-color: var(--accent); }
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
    .block-head .sub, .block-head .tape { margin-left: 0; }
  }
</style>
