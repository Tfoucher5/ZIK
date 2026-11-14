<!-- Hôte revenu sur l'accueil : sa soirée de moins de 12 h est encore ouverte. La clé est
     sur ce navigateur, celui de la TV : on rouvre l'écran TV -->
<script>
  import { onMount } from 'svelte';
  import { openLastSalon } from '$lib/client/salonClient.js';

  let code = $state(null);
  onMount(async () => (code = await openLastSalon()));
</script>

{#if code}
  <a class="rb" href="/salon/host?code={code}">
    Reprendre l'écran TV de votre soirée <b>{code}</b> <span aria-hidden="true">→</span>
  </a>
{/if}

<style>
  .rb {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 10px clamp(16px, 4vw, 56px);
    background: var(--text);
    color: var(--bg);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 1.05rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-decoration: none;
  }
  .rb b { font-family: 'JetBrains Mono', monospace; letter-spacing: 0.12em; }
  .rb:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
</style>
