<script>
  import { getContext } from 'svelte';
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import VideoQueue from '$lib/components/admin/videoQueue/VideoQueue.svelte';

  const adminCtx = getContext('adminToken');
</script>

<div class="adm-page">
  <PageHeader title="Vidéos à réparer">
    <a class="a-btn small" href="/admin/reparer">Retour</a>
  </PageHeader>
  {#if adminCtx?.token}
    {#key adminCtx.token}
      <VideoQueue token={adminCtx.token} />
    {/key}
  {/if}
</div>
