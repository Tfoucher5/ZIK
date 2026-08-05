<script>
  import { getContext } from "svelte";
  import ZikleGame from "$lib/components/ZikleGame.svelte";

  let { data } = $props();

  const _ctx = getContext("zik");
  const user = $derived(_ctx.user);
  const authReady = $derived(_ctx.authReady);
  const openAuthModal = _ctx.openAuthModal;
</script>

<svelte:head>
  <title>Zikle #{data.dayNumber} — Archives | ZIK</title>
  <meta name="description" content="Rejoue le Zikle #{data.dayNumber} ({data.date}). Compte requis pour jouer aux archives." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/zikle/archives/{data.date}" />
</svelte:head>

<main class="zikle-page">
  <div class="zikle-glow" aria-hidden="true"></div>

  {#if !authReady}
    <p class="zikle-empty">Chargement…</p>
  {:else if !user}
    <div class="zikle-wall">
      <p class="zikle-wall-kicker">Archive · {data.date}</p>
      <h1 class="zikle-wall-title">Zikle #{data.dayNumber}</h1>
      <p class="zikle-wall-txt">Les jours passés sont réservés aux comptes. Le Zikle du jour reste libre.</p>
      <div class="zikle-wall-actions">
        <button class="zikle-wall-btn" onclick={() => openAuthModal("login")}>Se connecter</button>
        <a class="zikle-wall-link" href="/zikle">Jouer le Zikle du jour</a>
      </div>
    </div>
  {:else}
    <ZikleGame date={data.date} dayNumber={data.dayNumber} previewUrl={data.previewUrl} />
  {/if}
</main>

<style>
  .zikle-page {
    position: relative;
    min-height: calc(100dvh - var(--nav-h));
    margin-top: var(--nav-h);
    padding: 32px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .zikle-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    width: min(120vw, 900px);
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgb(var(--accent-rgb) / 0.09), transparent 62%);
    pointer-events: none;
    z-index: 0;
  }
  .zikle-empty {
    color: var(--mid);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .zikle-wall {
    position: relative;
    z-index: 1;
    max-width: 460px;
    padding: 0 24px;
    text-align: center;
    animation: wall-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .zikle-wall-kicker {
    margin: 0 0 6px;
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 700;
    font-size: 0.64rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .zikle-wall-title {
    margin: 0 0 14px;
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: clamp(2.4rem, 9vw, 3.6rem);
    line-height: 0.92;
    text-transform: uppercase;
    color: var(--text);
  }
  .zikle-wall-txt {
    margin: 0 0 22px;
    color: var(--mid);
    font-size: 0.92rem;
    line-height: 1.6;
  }
  .zikle-wall-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .zikle-wall-btn {
    -webkit-appearance: none;
    appearance: none;
    padding: 12px 30px;
    background: var(--accent);
    border: none;
    border-radius: 2px;
    color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 0.82rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 0 6px 30px rgb(var(--accent-rgb) / 0.35);
    transition: filter 0.15s, box-shadow 0.2s;
  }
  .zikle-wall-btn:hover {
    filter: brightness(1.08);
    box-shadow: 0 8px 38px rgb(var(--accent-rgb) / 0.5);
  }
  .zikle-wall-link {
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 700;
    font-size: 0.74rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--mid);
    border-bottom: 1px solid var(--border2);
    padding-bottom: 1px;
    transition: color 0.15s;
  }
  .zikle-wall-link:hover {
    color: var(--accent);
  }

  @keyframes wall-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    .zikle-page {
      padding-bottom: 64px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .zikle-wall {
      animation: none;
    }
  }
</style>
