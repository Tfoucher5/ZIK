<script>
  /**
   * En-tête du profil : identité, actions, chiffres clés et compteurs sociaux.
   *
   * Depuis le retrait du badge d'accès, la largeur est disponible : les actions
   * remontent à droite de l'identité et le bandeau de chiffres occupe toute la
   * largeur, au lieu de rester tassé à gauche.
   *
   * @type {{
   *   nom: string, avatar: string, niveau: number, elo: number,
   *   membreDepuis: string, parties: number,
   *   scoreTotal: string, podiumsPct: number,
   *   ordinal: string|null, detailRang: string|null,
   *   social: any, presence: any, profilId: string,
   *   estLeSien: boolean, peutSuivre: boolean,
   *   followBusy: boolean, friendBusy: boolean,
   *   onEdit: () => void, onFriendAction: (a: string) => void,
   *   onToggleFollow: () => void, onJoinRoom: (r: any) => void, onInvite: (c: any) => void,
   * }}
   */
  let {
    nom, avatar, niveau, elo, membreDepuis, parties, scoreTotal, podiumsPct,
    ordinal, detailRang, social, presence, profilId,
    estLeSien, peutSuivre, followBusy, friendBusy,
    onEdit, onFriendAction, onToggleFollow, onJoinRoom, onInvite,
  } = $props();
</script>

<header class="marquee">
  <div class="marquee-top">
    <span class="eyebrow">ZIK · <b>Profil</b></span>
    <span class="rule"></span>
    <span class="eyebrow">Niveau {niveau}</span>
  </div>

  <div class="id-row">
    <div class="identity">
      <img class="identity-av" src={avatar} alt="" width="84" height="84">
      <div class="id-text">
        <h1 class="name">{nom}<span class="pt">.</span></h1>
        <div class="tagline">
          {#if membreDepuis}Membre depuis {membreDepuis}&nbsp;·&nbsp;{/if}<b>{parties} parties jouées</b>
        </div>
      </div>
    </div>

    <div class="marquee-actions">
      {#if estLeSien}
        <button class="btn btn-accent" onclick={onEdit}>Modifier mon profil</button>
      {:else if peutSuivre}
        {#if social.friendStatus === 'friends'}
          <button class="btn btn-friend" onclick={() => onFriendAction('remove')} disabled={friendBusy}>★ Amis</button>
          {#if presence[profilId]?.room}
            <button class="btn btn-accent" onclick={() => onJoinRoom(presence[profilId].room)}>▶ Rejoindre sa room</button>
          {:else}
            <button class="btn" onclick={() => onInvite({ id: profilId, username: nom })}>Inviter à jouer</button>
          {/if}
        {:else if social.friendStatus === 'pending_out'}
          <button class="btn btn-following" onclick={() => onFriendAction('remove')} disabled={friendBusy}>⏳ Demande envoyée</button>
        {:else if social.friendStatus === 'pending_in'}
          <button class="btn btn-accent" onclick={() => onFriendAction('accept')} disabled={friendBusy}>✓ Accepter</button>
          <button class="btn" onclick={() => onFriendAction('remove')} disabled={friendBusy}>Refuser</button>
        {:else}
          <button class="btn btn-accent" onclick={() => onFriendAction('request')} disabled={friendBusy}>+ Ajouter en ami</button>
        {/if}
        <button class="btn" class:btn-following={social.viewerFollows} onclick={onToggleFollow} disabled={followBusy}>
          {social.viewerFollows ? '✓ Suivi' : '+ Suivre'}
        </button>
        {#if social.followsViewer && !social.viewerFollows}<span class="follows-you">Vous suit</span>{/if}
      {/if}
    </div>
  </div>

  <div class="headline-stats">
    <div class="hs max"><b>{elo || '—'}</b><span>ELO</span></div>
    <div class="hs"><b>{scoreTotal}</b><span>Score total</span></div>
    <div class="hs"><b>{podiumsPct}%</b><span>Podiums</span></div>
    {#if ordinal}<div class="hs gold"><b>{ordinal}</b><span>{detailRang}</span></div>{/if}
  </div>

  <div class="social-row">
    <div class="social-cell"><b>{social.followers}</b><span>Abonnés</span></div>
    <div class="social-cell"><b>{social.following}</b><span>Abonnements</span></div>
    <div class="social-cell amis"><b>{social.friendsCount}</b><span>Amis</span></div>
  </div>
</header>

<style>
  .marquee { padding: 30px 0 24px; }
  .marquee-top { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
  .marquee-top .rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--border2), transparent); }

  /* Identité à gauche, actions à droite : la place libérée par le badge. */
  .id-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; flex-wrap: wrap; }
  .identity { display: flex; align-items: center; gap: 20px; min-width: 0; }
  .identity-av {
    width: 84px; height: 84px; border-radius: 50%;
    object-fit: cover; flex-shrink: 0;
    border: 2px solid var(--border2); background: var(--surface);
  }
  .id-text { min-width: 0; }
  .name {
    font-family: "Barlow Condensed", sans-serif; font-weight: 900; text-transform: uppercase;
    line-height: 0.86; letter-spacing: -0.01em; font-size: clamp(34px, 5.4vw, 86px); overflow-wrap: anywhere; hyphens: auto;
    animation: pv-namein 0.7s cubic-bezier(.22,1,.36,1) both;
  }
  .name .pt { color: var(--accent); }
  .tagline { font-family: "Barlow Condensed", sans-serif; font-weight: 600; font-size: 1.05rem; letter-spacing: 0.04em; color: var(--mid); margin-top: 10px; text-transform: uppercase; }
  .tagline b { color: var(--text); }

  /* Le bandeau de chiffres prend toute la largeur au lieu de rester tassé. */
  .headline-stats { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; margin-top: 26px; border: 1px solid var(--border2); border-radius: var(--radius); overflow: hidden; }
  .hs { padding: 16px 24px; border-right: 1px solid var(--border); min-width: 0; }
  .hs:last-child { border-right: none; }
  .hs b { display: block; font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 1.6rem; line-height: 1; font-variant-numeric: tabular-nums; }
  .hs.max b { color: var(--accent); font-size: 1.9rem; }
  .hs.gold b { color: var(--gold); }
  .hs span { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--dim); margin-top: 5px; display: block; }

  .marquee-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex-shrink: 0; }
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

  .social-row { display: inline-flex; margin-top: 18px; border: 1px solid var(--border2); border-radius: 99px; overflow: hidden; max-width: 100%; }
  .social-cell { display: flex; align-items: baseline; gap: 7px; padding: 9px 20px; border-right: 1px solid var(--border); }
  .social-cell:last-child { border-right: none; }
  .social-cell b { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 1rem; font-variant-numeric: tabular-nums; }
  .social-cell.amis b { color: var(--gold); }

  @keyframes pv-namein {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: none; }
  }

  @media (max-width: 900px) {
    .id-row { align-items: flex-start; flex-direction: column; gap: 20px; }
  }

  @media (max-width: 640px) {
    .headline-stats { grid-auto-flow: row; grid-template-columns: 1fr 1fr; grid-auto-columns: auto; }
    .hs { padding: 12px 14px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); }
    .hs:nth-child(2n) { border-right: none; }
    .hs:nth-child(n + 3) { border-bottom: none; }
    .hs b, .hs.max b { font-size: 1.5rem; }
    .social-row { display: flex; width: 100%; }
    .social-cell { flex: 1; flex-direction: column; align-items: center; gap: 2px; padding: 9px 6px; text-align: center; }
    .social-cell span { font-size: 0.54rem; letter-spacing: 0.1em; }
  }

  @media (prefers-reduced-motion: reduce) {
    .name { animation: none !important; }
  }
</style>
