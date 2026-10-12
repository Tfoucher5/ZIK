<script>
  let { type, reportedUsername } = $props();
</script>

<div class="rm-head">
  <div class="rm-ico">{type === 'user' ? '🚨' : '🐛'}</div>
  <div class="rm-head-txt">
    <div class="rm-kicker">{type === 'user' ? 'Modération' : 'Rapport technique'}</div>
    {#if type === 'user'}
      <h2 class="rm-title">Signaler <span class="rm-username">{reportedUsername}</span></h2>
    {:else}
      <h2 class="rm-title">Signaler un bug</h2>
    {/if}
  </div>
</div>
<p class="rm-subtitle">
  {type === 'user'
    ? 'Le signalement est anonyme et sera examiné par un modérateur.'
    : "Décris ce qui s'est passé pour nous aider à corriger le problème."}
</p>

<style>
.rm-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
  padding-right: 30px;
}
.rm-ico {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  background: rgb(var(--rm-c) / 0.12);
  border: 1px solid rgb(var(--rm-c) / 0.35);
  box-shadow: 0 0 28px rgb(var(--rm-c) / 0.25);
}
.rm-kicker {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgb(var(--rm-c) / 0.95);
  margin-bottom: 4px;
}
.rm-title {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.05;
  color: var(--text, #fafafa);
}
.rm-username { color: var(--accent, #ff00ff); }
.rm-subtitle {
  font-size: 0.8rem;
  color: var(--mid, #8896aa);
  margin-bottom: 20px;
}
</style>
