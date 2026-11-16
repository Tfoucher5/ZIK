<script>
  import { onMount } from 'svelte';
  import { openLastSalon, forgetSalon } from '$lib/client/salonClient.js';

  /** Hôte qui a fermé l'onglet de sa TV ou de sa régie : il retrouve sa soirée. */
  let code = $state(null);
  onMount(async () => (code = await openLastSalon()));

  function oublier() {
    forgetSalon(code);
    code = null;
  }
</script>

{#if code}
  <section class="rs" aria-labelledby="rs-titre">
    <h2 id="rs-titre"><i aria-hidden="true"></i>Ta soirée <span>{code}</span> est encore ouverte</h2>
    <p>Rouvre l'écran TV ou la régie pour la reprendre là où elle en est. Les joueurs n'ont rien à refaire.</p>
    <div class="acts">
      <a href="/salon/host?code={code}">Reprendre l'écran TV</a>
      <a href="/salon/regie?code={code}">Ouvrir la régie</a>
      <button type="button" onclick={oublier}>Non, créer une nouvelle soirée</button>
    </div>
  </section>
{/if}

<style>
  .rs {
    display: grid;
    gap: 10px;
    padding: 18px;
    border: 1px solid rgba(61, 220, 132, 0.45);
    border-radius: 18px;
    background: rgba(61, 220, 132, 0.06);
  }
  h2 { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.5rem; line-height: 1; }
  h2 span { font-family: var(--mono); font-size: 0.8em; letter-spacing: 0.1em; }
  i { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--ok); }
  p { font-size: 15px; line-height: 1.45; color: var(--soft); }
  .acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 18px;
    border: 1px solid var(--line-2);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text);
    font-family: var(--titre);
    font-weight: 800;
    font-size: 16px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-decoration: none;
  }
  a:hover { background: rgba(255, 255, 255, 0.1); }
  button {
    min-height: 44px;
    padding: 0 4px;
    border: 0;
    background: none;
    color: var(--muted);
    font: inherit;
    font-size: 15px;
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: pointer;
  }
</style>
