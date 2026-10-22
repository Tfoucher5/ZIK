<script>
  import { getContext } from "svelte";
  import JsonLd from '$lib/components/ui/JsonLd.svelte';
  import ArchivesHeader from "$lib/components/zikle/ArchivesHeader.svelte";
  import ArchiveDay from "$lib/components/zikle/ArchiveDay.svelte";
  import { loadGuestHistory } from "$lib/components/zikle/history.js";
  import { breadcrumb } from '$lib/shared/seo.js';
  const breadcrumbJsonLd = breadcrumb([{ name: 'Zikle', path: '/zikle' }, { name: 'Archives', path: '/zikle/archives' }]);


  let { data } = $props();

  const _ctx = getContext("zik");
  const sb = _ctx.sb;
  const user = $derived(_ctx.user);
  const authReady = $derived(_ctx.authReady);
  const openAuthModal = _ctx.openAuthModal;

  // date -> { won, attempts } pour les jours déjà terminés
  let played = $state({});
  let loadedFor = null;

  // Comme pour le jeu, on attend authReady : avant, `user` vaut toujours null
  // et on lirait l'historique invité pour un compte connecté.
  $effect(() => {
    if (!authReady) return;
    const key = user ? user.id : "guest";
    if (loadedFor === key) return;
    loadedFor = key;
    loadPlayed();
  });

  async function loadPlayed() {
    if (user) {
      const { data: rows } = await sb
        .from("daily_results")
        .select("date, won, attempts")
        .limit(500);
      played = Object.fromEntries(
        (rows || []).map((r) => [r.date, { won: r.won, attempts: r.attempts }]),
      );
      return;
    }
    played = Object.fromEntries(
      Object.entries(loadGuestHistory()).map(([d, v]) => [
        d,
        { won: v.won, attempts: v.attempts?.length ?? 0 },
      ]),
    );
  }
</script>

<svelte:head>
  <title>Archives Zikle - Rejoue les jours passés | ZIK</title>
  <meta name="description" content="Retrouve tous les Zikle passés : un extrait audio, six essais, un titre par jour. Rejoue les jours précédents avec ton compte ZIK." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/zikle/archives" />
  <meta property="og:title" content="Archives Zikle" />
  <meta property="og:description" content="Rejoue les Zikle des jours précédents." />
  <meta property="og:url" content="https://www.zik-music.fr/zikle/archives" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />
  <JsonLd json={breadcrumbJsonLd} />
</svelte:head>

<main class="za">
  <div class="za-glow" aria-hidden="true"></div>

  <div class="za-inner">
  <ArchivesHeader count={data.days.length} />

  {#if authReady && !user}
    <p class="za-notice">
      Les jours passés demandent un compte.
      <button onclick={() => openAuthModal("login")}>Se connecter</button>
    </p>
  {/if}

  {#if !data.days.length}
    <div class="za-empty">
      <p class="za-empty-title">Rien à rejouer pour l'instant</p>
      <p class="za-empty-txt">Le premier Zikle archivé apparaîtra ici demain.</p>
      <a class="za-empty-cta" href="/zikle">Jouer le Zikle du jour</a>
    </div>
  {:else}
    <ol class="za-list">
      {#each data.days as day, i (day.date)}
        <li style="--i: {Math.min(i, 14)}">
          <ArchiveDay {day} done={played[day.date]} />
        </li>
      {/each}
    </ol>
  {/if}
  </div>
</main>

<style>
  /* Le body du site est en flex column : des marges auto latérales ici
     annuleraient l'étirement et la page se réduirait à la largeur du contenu.
     On garde donc .za pleine largeur et on centre via .za-inner. */
  .za {
    position: relative;
    min-height: calc(100dvh - var(--nav-h));
    margin-top: var(--nav-h);
    padding: clamp(32px, 7vh, 72px) 20px 90px;
  }
  .za-inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
  }
  .za-glow {
    position: absolute;
    top: 0;
    left: 50%;
    width: min(120vw, 900px);
    aspect-ratio: 1;
    transform: translate(-50%, -40%);
    background: radial-gradient(circle, rgb(var(--accent-rgb) / 0.08), transparent 62%);
    pointer-events: none;
    z-index: 0;
  }

  /* ── Bandeau compte requis ── */
  .za-notice {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin: 0 0 18px;
    padding: 11px 16px;
    background: rgb(var(--accent-rgb) / 0.06);
    border-left: 3px solid var(--accent);
    font-size: 0.86rem;
    color: var(--mid);
    animation: za-in 0.5s 0.08s ease both;
  }
  .za-notice button {
    -webkit-appearance: none;
    appearance: none;
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
    border-bottom: 1px solid rgb(var(--accent-rgb) / 0.5);
  }

  /* ── Liste ── */
  .za-list {
    position: relative;
    z-index: 1;
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .za-list li {
    animation: za-slide 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(0.1s + var(--i) * 0.04s);
  }

  /* ── Vide ── */
  .za-empty {
    position: relative;
    z-index: 1;
    text-align: center;
    padding: clamp(40px, 10vh, 90px) 20px;
    border: 1px dashed var(--border2);
    animation: za-in 0.5s 0.1s ease both;
  }
  .za-empty-title {
    margin: 0 0 8px;
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 1.4rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text);
  }
  .za-empty-txt {
    margin: 0 0 22px;
    color: var(--mid);
    font-size: 0.9rem;
  }
  .za-empty-cta {
    display: inline-block;
    padding: 12px 28px;
    background: var(--accent);
    color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 900;
    font-size: 0.78rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    box-shadow: 0 6px 30px rgb(var(--accent-rgb) / 0.32);
    transition: filter 0.15s;
  }
  .za-empty-cta:hover {
    filter: brightness(1.08);
  }

  @keyframes -global-za-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes za-slide {
    from {
      opacity: 0;
      transform: translateX(-12px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  @media (max-width: 768px) {
    .za {
      padding-bottom: 110px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .za-notice,
    .za-list li,
    .za-empty {
      animation: none !important;
    }
  }
</style>
