<script>
  import Card from '$lib/components/card/Card.svelte';
  import CardViewer from '$lib/components/card/CardViewer.svelte';
  import { shareCard } from '$lib/components/card/shareCard.js';

  let { data } = $props();

  const card = $derived(data.card);
  const url = $derived(`https://www.zik-music.fr/carte/${card.number}`);
  const fans = $derived(card.fans.toLocaleString('fr-FR'));
  let shareMsg = $state('');

  async function share() {
    const result = await shareCard(card);
    shareMsg = result === 'downloaded' ? 'Image téléchargée, texte copié' : '';
  }

  let reportMsg = $state('');
  let reportState = $state('');

  async function report(e) {
    e.preventDefault();
    reportState = 'sending';
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'bug',
        subject: 'card',
        message: reportMsg.trim(),
        metadata: { card: card.number },
      }),
    }).catch(() => null);
    reportState = res?.ok ? 'sent' : 'error';
  }
</script>

<svelte:head>
  <title>{card.title} - {card.artist} | Carte {data.rarityLabel} ZIK</title>
  <meta
    name="description"
    content={`Carte ${data.rarityLabel} n° ${card.number} : ${card.title} de ${card.artist} (${card.year}). Gagne-la en la trouvant en premier dans un blind test ZIK.`}
  />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href={url} />
  <meta property="og:title" content={`${card.title} - ${card.artist}, carte ${data.rarityLabel}`} />
  <meta property="og:description" content="Une carte de la collection ZIK, à gagner en blind test." />
  <meta property="og:image" content={`https://www.zik-music.fr${card.shareImage}`} />
  <meta property="og:url" content={url} />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<CardViewer />

<main class="cp">
  <div class="cp-card">
    <Card {card} size="lg" motion="full" inspectable list={[card]} />
  </div>

  <section class="cp-info" aria-labelledby="cp-title">
    <p class="cp-kicker" data-rarity={card.rarity}>
      <span class="cp-disc" aria-hidden="true"></span>
      Carte {data.rarityLabel}, n° {card.number}{card.rising ? ', en ascension' : ''}
    </p>
    <h1 id="cp-title" class="cp-title">{card.title}</h1>
    <p class="cp-artist">{card.artist}</p>
    <p class="cp-album">{card.album}{card.year ? `, ${card.year}` : ''}</p>

    <dl class="cp-stats">
      <div><dt>Joueurs qui l'ont</dt><dd>{data.owners}</dd></div>
      <div><dt>Fans de l'artiste</dt><dd>{fans}</dd></div>
      <div>
        <dt>Trouvée en partie</dt>
        <dd>{card.successRate == null ? '-' : `${Math.round(card.successRate * 100)} %`}</dd>
      </div>
      <div><dt>Premier à l'avoir</dt><dd>{card.firstOwner ?? 'personne pour l’instant'}</dd></div>
    </dl>

    <div class="cp-actions">
      <a class="cp-btn cp-btn-main" href="/rooms">Jouer pour la gagner</a>
      <button type="button" class="cp-btn" onclick={share}>Partager</button>
    </div>
    {#if shareMsg}<p class="cp-msg" role="status">{shareMsg}</p>{/if}

    <p class="cp-how">
      Les cartes se gagnent en trouvant le titre en premier dans une partie à plusieurs.
      <a href="/docs#cartes">Comment ça marche</a>
    </p>

    <details class="cp-report">
      <summary>Une erreur sur cette carte ?</summary>
      {#if reportState === 'sent'}
        <p class="cp-msg" role="status">Merci, on vérifie et on corrige.</p>
      {:else}
        <form onsubmit={report}>
          <label for="cp-report-msg">Ce qui ne va pas (mauvais titre, mauvais artiste, mauvaise pochette…)</label>
          <textarea id="cp-report-msg" rows="3" maxlength="500" bind:value={reportMsg}></textarea>
          <button type="submit" class="cp-btn" disabled={reportState === 'sending'}>
            {reportState === 'sending' ? 'Envoi…' : 'Signaler'}
          </button>
          {#if reportState === 'error'}<p class="cp-msg" role="alert">Envoi impossible, réessaie.</p>{/if}
        </form>
      {/if}
    </details>
  </section>
</main>

<style>
  .cp {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: clamp(28px, 6vw, 72px);
    max-width: 1100px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 40px) 16px 96px;
    color: var(--text);
  }

  .cp-info {
    display: grid;
    width: min(100%, 440px);
  }

  .cp-kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 10px;
    font: 600 0.9rem/1 'Barlow', sans-serif;
    color: var(--mid);
  }

  .cp-disc {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background:
      radial-gradient(circle, #0a0a0c 0 12%, transparent 13%),
      radial-gradient(circle, var(--rc-light), var(--rc) 70%);
  }

  .cp-title {
    margin: 0;
    font: 700 clamp(2.4rem, 6vw, 3.6rem) / 0.95 'Barlow Condensed', sans-serif;
  }

  .cp-artist {
    margin: 10px 0 0;
    font: 600 1.15rem/1.2 'Barlow', sans-serif;
  }

  .cp-album {
    margin: 4px 0 0;
    color: var(--mid);
  }

  .cp-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin: 26px 0 0;
    padding: 18px 0;
    border-block: 1px solid var(--border);
  }

  .cp-stats div {
    display: flex;
    flex-direction: column-reverse;
    gap: 4px;
  }

  .cp-stats dt {
    font-size: 0.82rem;
    color: var(--mid);
  }

  .cp-stats dd {
    margin: 0;
    font: 700 1.3rem/1.1 'Barlow Condensed', sans-serif;
  }

  .cp-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 22px;
  }

  .cp-btn {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 20px;
    border: 1px solid var(--border2);
    border-radius: 99px;
    background: var(--surface);
    color: var(--text);
    font: 600 0.95rem/1 'Barlow', sans-serif;
    text-decoration: none;
    cursor: pointer;
  }

  .cp-btn-main {
    border-color: transparent;
    background: var(--accent);
    color: var(--on-accent, #fff);
  }

  .cp-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .cp-msg {
    margin: 10px 0 0;
    font-size: 0.88rem;
    color: var(--mid);
  }

  .cp-how {
    margin: 22px 0 0;
    font-size: 0.9rem;
    color: var(--mid);
  }

  .cp-report {
    margin-top: 18px;
    font-size: 0.88rem;
    color: var(--mid);
  }

  .cp-report summary {
    cursor: pointer;
    width: fit-content;
  }

  .cp-report form {
    display: grid;
    gap: 8px;
    margin-top: 10px;
    justify-items: start;
  }

  .cp-report textarea {
    width: 100%;
    max-width: 420px;
    padding: 10px 12px;
    border: 1px solid var(--border2);
    border-radius: 10px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    resize: vertical;
  }
</style>
