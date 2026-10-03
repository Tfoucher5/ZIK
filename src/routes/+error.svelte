<script>
  import { page } from '$app/state';

  const ERRORS = {
    404: {
      label: 'Page introuvable',
      title: 'Le disque est rayé.',
      desc: "Cette page n'existe pas, ou elle a été déplacée dans une vieille playlist qu'on préfère oublier.",
    },
    403: {
      label: 'Accès refusé',
      title: 'Backstage verrouillé.',
      desc: 'Tu entends la musique, tu vois les lumières, mais le videur a dit non. Connecte-toi avec le bon compte pour entrer.',
    },
    500: {
      label: 'Erreur serveur',
      title: "L'ampli a sauté.",
      desc: 'Le serveur a joué un solo trop fort. Réessaie dans un instant, on remet le fusible.',
    },
  };

  const status = $derived(page.status || 500);
  const current = $derived(ERRORS[status] ?? {
    label: 'Incident',
    title: 'Quelque chose a déraillé.',
    desc: "Une erreur inattendue s'est produite. Réessaie dans un instant.",
  });
  const canRetry = $derived(status >= 500);
</script>

<svelte:head>
  <title>{status} · {current.title} | ZIK</title>
  <meta name="robots" content="noindex">
</svelte:head>

<main class="err">
  <a href="/" class="err-logo">ZIK<span>.</span></a>

  <p class="err-kicker">Erreur {status} · {current.label}</p>
  <h1>{current.title}</h1>
  <p class="err-desc">{current.desc}</p>

  <div class="err-actions">
    {#if canRetry}
      <button class="err-btn err-btn-primary" onclick={() => window.location.reload()}>Réessayer</button>
      <a href="/" class="err-btn">Retour à l'accueil</a>
    {:else}
      <a href="/" class="err-btn err-btn-primary">Retour à l'accueil</a>
    {/if}
  </div>

  {#if status === 404}
    <nav class="err-links" aria-label="Pages utiles">
      <p>Ou file directement :</p>
      <a href="/rooms">Jouer en ligne →</a>
      <a href="/salon">Organiser une soirée →</a>
      <a href="/zikle">La chanson du jour (Zikle) →</a>
    </nav>
  {/if}
</main>

<style>
  .err {
    min-height: 100dvh;
    max-width: 640px;
    margin: 0 auto;
    padding: 48px 24px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 16px;
    font-family: 'Barlow', system-ui, sans-serif;
    color: var(--text);
  }
  .err-logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.6rem;
    letter-spacing: 0.08em;
    color: var(--text);
    text-decoration: none;
    margin-bottom: 24px;
  }
  .err-logo span { color: var(--accent); }
  .err-kicker {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.85rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
  }
  h1 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2.8rem, 9vw, 4.5rem);
    line-height: 0.92;
    text-transform: uppercase;
    margin: 0;
  }
  .err-desc { font-size: 1.05rem; line-height: 1.6; color: var(--mid); max-width: 48ch; }
  .err-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
  .err-btn {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 0.95rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 13px 24px;
    border: 2px solid var(--text);
    border-radius: 3px;
    background: none;
    color: var(--text);
    text-decoration: none;
    cursor: pointer;
  }
  .err-btn-primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .err-links {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }
  .err-links p { color: var(--mid); font-size: 0.95rem; }
  .err-links a { color: var(--accent); font-weight: 700; text-decoration: none; }
  .err-links a:hover { text-decoration: underline; text-underline-offset: 3px; }
</style>
