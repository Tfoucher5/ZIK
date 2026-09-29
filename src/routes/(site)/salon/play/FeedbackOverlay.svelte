<script>
  let { feedback = null } = $props();
</script>

{#if feedback}
  <div class="sp-toast {feedback.correct ? 'ok' : feedback.type === 'close' ? 'close' : 'ko'}" role="status">
    {feedback.msg}
    {#if feedback.correct && feedback.points > 0}<b>+{feedback.points}</b>{/if}
  </div>
{/if}
