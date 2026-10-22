<script>
  /** Étape 2 : code de la room à partager, lien et accès direct. */
  let { code, oncopy, onjoin } = $props();
</script>

<p class="mdesc">Partage ce code à tes amis pour qu'ils rejoignent la room.</p>

<div class="room-code-box">
  <div class="room-code-label">Code de la room</div>
  <div class="room-code">
    {#each code.split('') as ch, i (i)}<b>{ch}</b>{/each}
  </div>
  <div class="room-share-url">{typeof window !== 'undefined' ? `${window.location.origin}/game?roomId=${code}` : ''}</div>
  <div class="room-code-actions">
    <button class="btn-ghost sm" onclick={oncopy}>Copier le lien</button>
    <button class="room-eph-create" onclick={onjoin}>Rejoindre maintenant &rarr;</button>
  </div>
</div>

<style>
.room-code-box {
  text-align: center;
  padding: 14px 0 4px;
}
.room-code-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--mid);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.room-code-label::before,
.room-code-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--border);
}
.room-code {
  display: flex;
  gap: 7px;
  justify-content: center;
  margin-bottom: 16px;
}
.room-code b {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-weight: 700;
  font-size: 1.7rem;
  width: 46px;
  height: 58px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--accent-rgb) / 0.08);
  border: 1px solid rgb(var(--accent-rgb) / 0.45);
  border-radius: 12px;
  color: var(--accent);
  text-shadow: 0 0 16px rgb(var(--accent-rgb) / 0.7);
  box-shadow: 0 0 20px rgb(var(--accent-rgb) / 0.1);
}
.room-share-url {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.68rem;
  color: var(--dim);
  word-break: break-all;
  background: rgb(var(--c-glass) / 0.04);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px 12px;
  margin-bottom: 16px;
}
.room-code-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
