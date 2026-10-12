<script>
  import { onMount } from 'svelte';
  import Card from '$lib/components/card/Card.svelte';
  import { launchConfetti } from './confetti.js';

  // Fin de partie : le disque d'or se dévoile, puis les crédits du 3e au 1er
  let {
    scores, username, isGuest, roomLabel, cardsInPlay, cardsResult, resultId,
    rejoinIn, countdownMode, heldRound, canReplay, onJoin, onReplay,
  } = $props();

  let revealStep = $state(0);
  let shareCopied = $state(false);

  onMount(() => {
    const timers = [
      setTimeout(() => { revealStep = 1; }, 600),
      setTimeout(() => { revealStep = 2; }, 2100),
      setTimeout(() => { revealStep = 3; launchConfetti(); }, 3900),
    ];
    return () => timers.forEach(clearTimeout);
  });

  async function share() {
    const url = `${location.origin}/results/${resultId}`;
    const me = scores.find(p => p.name === username);
    const text = me ? `J'ai marqué ${me.score} pts au blind test "${roomLabel}" sur ZIK ! Tu fais mieux ?` : 'Défie-moi au blind test sur ZIK !';
    if (navigator.share) {
      try { await navigator.share({ title: 'Mon score ZIK', text, url }); return; } catch { /* annulé */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      shareCopied = true;
      setTimeout(() => { shareCopied = false; }, 2500);
    } catch { /* clipboard indisponible */ }
  }
</script>

<div class="g-gameover">
  <div class="g-go-inner">

    <!-- Le trophée : disque d'or -->
    <div class="g-go-award" class:won={revealStep >= 3}>
      <div class="g-go-frame">
        <div class="g-go-disc-wrap">
          <div class="g-go-disc"></div>
          <div class="g-go-disc-label">
            {#if revealStep >= 3 && scores[0]}
              <span class="g-go-disc-name">{scores[0].name}</span>
              <span class="g-go-disc-pts">{scores[0].score} pts</span>
            {:else}
              <span class="g-go-disc-q">?</span>
            {/if}
          </div>
        </div>
        <div class="g-go-plaque">
          <div class="g-go-plaque-title">Disque d'or</div>
          <div class="g-go-plaque-sub">décerné à</div>
          <div class="g-go-plaque-name">{revealStep >= 3 ? (scores[0]?.name ?? '—') : '· · ·'}</div>
          <div class="g-go-plaque-room">{roomLabel}</div>
        </div>
      </div>
    </div>

    <!-- Les crédits de fin -->
    <div class="g-go-credits">
      <div class="g-go-eyebrow">Partie terminée</div>
      <div class="g-go-credits-title">Crédits de fin</div>
      <div class="g-go-tracklist">
        {#each scores as p, i (p.name)}
          <div
            class="g-go-track t{Math.min(i + 1, 4)}"
            class:me={p.name === username}
            class:revealed={i === 0 ? revealStep >= 3 : i === 1 ? revealStep >= 2 : revealStep >= 1}
          >
            <span class="g-go-tnum">{String(i + 1).padStart(2, '0')}</span>
            <span class="g-go-tname">
              {#if p.isGuest}{p.name} <span class="g-go-guest">(invit&eacute;)</span>{:else}<a href="/user/{p.name}" class="g-go-link">{p.name}</a>{/if}
              {#if p.name === username}<span class="g-go-tyou">TOI</span>{/if}
            </span>
            <span class="g-go-tfill"></span>
            <span class="g-go-tpts">{p.score} pts</span>
          </div>
        {/each}
      </div>

      {#if isGuest}
        {@const myScore = scores.find(p => p.name === username)?.score ?? 0}
        <p class="g-go-guest-note">
          Tu joues en invité : {myScore > 0 ? `tes ${myScore} pts ne seront pas gardés` : 'ton score n’est pas gardé'}.
          Un compte gratuit les enregistre et te fait entrer au classement.
        </p>
      {/if}

      {#if cardsInPlay.length}
        <section class="g-go-cards" aria-label="Tes cartes de la partie">
          <p class="g-go-cards-title">
            {cardsInPlay.length} nouvelle{cardsInPlay.length > 1 ? 's' : ''} carte{cardsInPlay.length > 1 ? 's' : ''} pour ta collection
          </p>
          <div class="g-go-cards-list">
            {#each cardsInPlay as entry (entry.card.id)}
              <Card card={entry.card} size="sm" motion="hover" inspectable list={cardsInPlay.map((e) => e.card)} />
            {/each}
          </div>
          {#each cardsResult?.sets ?? [] as set (set.id)}
            <p class="g-go-cards-set">
              {set.kind === 'album' ? 'Album complété' : 'Artiste complété'} : <strong>{set.name}</strong>
            </p>
          {/each}
          <a href="/collection" class="g-go-share">Voir ma collection</a>
        </section>
      {/if}

      <div class="g-go-actions">
      <div class="g-go-lead">
        {#if rejoinIn > 0}
          <span class="g-rejoin-note">
            {countdownMode === 'replay' ? 'Nouvelle partie' : 'La partie a démarré'} dans {rejoinIn} s
          </span>
        {/if}
        {#if heldRound}
          <button class="g-start-btn" onclick={onJoin}>Rejoindre la partie</button>
        {:else if canReplay}
          <button class="g-start-btn" onclick={onReplay}>Rejouer</button>
        {:else}
          <span class="g-rejoin-note">En attente de l&apos;admin pour rejouer</span>
        {/if}
      </div>

      <div class="g-go-more">
      {#if resultId}
        <button class="g-go-share" onclick={share}>
          {shareCopied ? 'Lien copié' : 'Partager mon score'}
        </button>
      {/if}
      {#if isGuest}
        <a href="/?auth=register&ref=room-guest" class="g-go-share">Créer un compte gratuit</a>
      {/if}
      <a href="/rooms" class="g-go-back">Changer de room</a>
      <a href="https://discord.gg/Xkr9aUEKYf" target="_blank" rel="noopener noreferrer" class="g-go-discord">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path fill-rule="evenodd" clip-rule="evenodd" fill="white" d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942.0209-.0406.0098-.0895-.0321-.1112a13.201 13.201 0 0 1-1.8735-.8914.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
        </svg>
        Discord
      </a>
      </div>
      </div>

      <div class="g-go-support-box">
        <span class="g-go-support-text">ZIK est gratuit et tourne sur un serveur payé de ma poche.</span>
        <a href="/soutenir" class="g-go-support-btn">Soutenir ZIK</a>
      </div>

    </div>

  </div>
</div>

<style>
  .g-go-share {
    background: none;
    border: 1px solid rgb(var(--accent-rgb) / 0.45);
    color: var(--accent);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 10px 22px;
    cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease;
  }
  .g-go-share:hover {
    background: rgb(var(--accent-rgb) / 0.1);
    box-shadow: 0 0 18px rgb(var(--accent-rgb) / 0.2);
  }
  .g-go-discord {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    background: #5865f2;
    color: #fff;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-decoration: none;
    transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 4px 14px rgba(88, 101, 242, 0.4);
  }
  .g-go-discord:hover {
    background: #4752c4;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(88, 101, 242, 0.5);
  }
</style>
