<script>
  import { onMount, untrack } from 'svelte';
  import { Relance } from '$lib/components/salon/relance/relance.svelte.js';
  import RelanceTv from '$lib/components/salon/relance/RelanceTv.svelte';
  import RelanceRegie from '$lib/components/salon/relance/RelanceRegie.svelte';
  import RelancePhone from '$lib/components/salon/relance/RelancePhone.svelte';

  let { ecran, code, version, error, onRemount } = $props();

  const relance = untrack(() => new Relance({ ecran, code, error, version, onRemount }));
  let repli = null;

  // L'écran de relance a lui-même planté : rechargement toutes les 30 s, sans dépendance
  function secours() {
    try {
      relance.destroy();
    } catch {
      /* déjà en repli */
    }
    try {
      if (!repli) repli = setInterval(() => navigator.onLine !== false && location.reload(), 30000);
    } catch {
      /* rien de plus à tenter */
    }
  }

  onMount(() => {
    try {
      relance.start();
    } catch {
      secours();
    }
    return () => {
      clearInterval(repli);
      try {
        relance.destroy();
      } catch {
        /* rien */
      }
    };
  });
</script>

<svelte:boundary onerror={secours}>
  {#if ecran === 'host'}
    <RelanceTv {relance} />
  {:else if ecran === 'regie'}
    <RelanceRegie {relance} />
  {:else}
    <RelancePhone {relance} />
  {/if}

  {#snippet failed()}
    <div
      role="status"
      style="position:fixed;inset:0;display:grid;place-content:center;gap:12px;padding:24px;background:#08080a;color:#f5f5f7;font:600 22px/1.4 system-ui,sans-serif;text-align:center"
    >
      <p style="margin:0;font-size:1.6em">On retourne le disque.</p>
      <p style="margin:0;opacity:.75">La page se recharge toute seule.</p>
    </div>
  {/snippet}
</svelte:boundary>
