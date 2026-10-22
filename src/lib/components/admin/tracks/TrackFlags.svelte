<script>
  /** Pastilles d'état d'un titre : signalé, sans extrait, vidéo épinglée. */
  let { t } = $props();
</script>

{#if t.reported}<em class="a-tag bad">signalé</em>{/if}
{#if !t.preview_url}<em class="a-tag warn">sans extrait</em>{/if}
{#if t.youtube_id}<em class="a-tag good">vidéo épinglée</em>{/if}
