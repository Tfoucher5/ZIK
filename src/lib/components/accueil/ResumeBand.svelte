<!-- Hôte revenu sur l'accueil : sa soirée de moins de 12 h est encore ouverte. La clé est
     sur ce navigateur, celui de la TV : on rouvre l'écran TV -->
<script>
  import { onMount } from 'svelte';
  import { openLastSalon } from '#lib/client/salonClient.js';

  let code = $state(null);
  onMount(async () => (code = await openLastSalon()));
</script>

{#if code}
  <a class="resume" href="/salon/host?code={code}">
    <i aria-hidden="true"></i>
    <span>Ta soirée <b>{code}</b> est <em>encore ouverte</em> · reprendre l'écran TV</span>
    <span class="go" aria-hidden="true">→</span>
  </a>
{/if}

<style>
  .resume {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    max-width: 100%;
    padding: 6px 8px 6px 14px;
    border-radius: 999px;
    border: 1px solid rgba(61, 220, 132, 0.45);
    background: rgba(8, 20, 14, 0.72);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
    color: var(--text);
    font-size: 14px;
    line-height: 1.2;
    text-align: left;
    text-decoration: none;
  }
  i {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ok);
  }
  b {
    font-family: var(--mono);
    letter-spacing: 0.1em;
  }
  em {
    font-style: normal;
    font-weight: 600;
    color: var(--ok);
  }
  .go {
    flex: none;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    margin-left: auto;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
  }
</style>
