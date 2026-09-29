<script>
  import { onMount, onDestroy } from 'svelte';
  import { env } from '$env/dynamic/public';

  // Vérification anti-robot Cloudflare Turnstile, exigée par Supabase Auth
  // (inscription, connexion, mot de passe oublié) quand la protection y est
  // activée. Sans clé de site configurée, le composant ne fait rien.
  // eslint-disable-next-line no-useless-assignment -- prop liée : écrite ici, lue par le formulaire parent
  let { token = $bindable(null) } = $props();

  const enabled = !!env.PUBLIC_TURNSTILE_SITE_KEY;

  let box;
  let widgetId = null;

  // Un jeton ne sert qu'une fois : à appeler après chaque tentative
  export function reset() {
    token = null;
    if (widgetId !== null) window.turnstile?.reset(widgetId);
  }

  function loadScript() {
    if (window.turnstile) return Promise.resolve();
    window.__zikTurnstile ??= new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.__zikTurnstile;
  }

  onMount(async () => {
    if (!enabled) return;
    await loadScript().catch(() => {});
    if (!window.turnstile || !box) return;
    widgetId = window.turnstile.render(box, {
      sitekey: env.PUBLIC_TURNSTILE_SITE_KEY,
      theme: 'dark',
      language: 'fr',
      callback: (t) => (token = t),
      'expired-callback': () => (token = null),
      'error-callback': () => (token = null),
    });
  });

  onDestroy(() => {
    if (widgetId !== null) window.turnstile?.remove(widgetId);
  });
</script>

{#if enabled}<div class="captcha" bind:this={box}></div>{/if}

<style>
  .captcha {
    min-height: 65px;
    margin: 4px 0;
  }
</style>
