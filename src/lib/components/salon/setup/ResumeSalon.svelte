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
    <div>
      <p class="sx-kicker">Soirée en cours</p>
      <h2 id="rs-titre">Votre soirée <span>{code}</span> est encore ouverte</h2>
      <p class="rs-txt">Rouvrez l'écran TV ou la régie pour la reprendre là où elle en est. Les joueurs n'ont rien à refaire.</p>
    </div>
    <div class="rs-actions">
      <a class="sx-btn" href="/salon/host?code={code}">Reprendre l'écran TV</a>
      <a class="sx-btn" href="/salon/regie?code={code}">Ouvrir la régie</a>
      <button class="rs-oublier" onclick={oublier}>Non, créer une nouvelle soirée</button>
    </div>
  </section>
{/if}

<style>
  .rs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin: 24px 0;
    padding: 24px;
    border: 1px solid var(--border2);
    border-radius: 14px;
    background: var(--surface2);
  }
  .rs h2 {
    margin: 6px 0;
    font-family: var(--s-cond);
    font-weight: 800;
    font-size: 1.5rem;
    text-transform: uppercase;
    line-height: 1.05;
  }
  .rs h2 span {
    font-family: var(--s-mono);
    letter-spacing: 0.08em;
  }
  .rs-txt {
    margin: 0;
    color: var(--mid);
  }
  .rs-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .rs-oublier {
    min-height: 44px;
    padding: 0 6px;
    border: 0;
    background: none;
    color: var(--mid);
    text-decoration: underline;
    cursor: pointer;
  }

  @media (max-width: 760px) {
    .rs-actions { width: 100%; }
    .rs-actions .sx-btn { flex: 1 1 100%; justify-content: center; }
  }
</style>
