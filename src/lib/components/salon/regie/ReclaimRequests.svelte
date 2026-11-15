<!-- Joueurs revenus sans leur jeton (autre téléphone, autre navigateur) : l'hôte confirme que c'est bien eux -->
<script>
  let { usernames = [], onAnswer } = $props();
</script>

{#each usernames as u (u)}
  <div class="rg-reclaim" role="alert">
    <p><b>{u}</b> veut reprendre sa place depuis un autre téléphone. C'est bien cette personne ?</p>
    <div class="rg-reclaim-actions">
      <button class="sx-btn" onclick={() => onAnswer(u, true)}>Rendre sa place</button>
      <button class="sx-btn" onclick={() => onAnswer(u, false)}>Refuser</button>
    </div>
  </div>
{/each}

<style>
  .rg-reclaim {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 12px 0;
    padding: 14px 16px;
    border: 2px solid var(--text);
    background: var(--surface2);
  }
  .rg-reclaim p { margin: 0; }
  .rg-reclaim-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .rg-reclaim-actions .sx-btn { min-height: 44px; }
</style>
