<script>
  import { onMount, untrack } from 'svelte';
  import { Relance } from '#lib/components/salon/relance/relance.svelte.js';
  import { TEXTES_SECOURS, creerSecours } from '#lib/components/salon/relance/relance.js';
  import RelanceTv from '#lib/components/salon/relance/RelanceTv.svelte';
  import RelanceRegie from '#lib/components/salon/relance/RelanceRegie.svelte';
  import RelancePhone from '#lib/components/salon/relance/RelancePhone.svelte';

  let { ecran, code, version, error, onRemount } = $props();

  const relance = untrack(() => new Relance({ ecran, code, error, version, onRemount }));
  const secours = creerSecours(relance);

  onMount(() => {
    try {
      relance.start();
    } catch {
      secours.declencher();
    }
    return secours.arreter;
  });
</script>

<svelte:boundary onerror={secours.declencher}>
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
      <p style="margin:0;font-size:1.6em">{TEXTES_SECOURS[0]}</p>
      <p style="margin:0;opacity:.75">{TEXTES_SECOURS[1]}</p>
    </div>
  {/snippet}
</svelte:boundary>
