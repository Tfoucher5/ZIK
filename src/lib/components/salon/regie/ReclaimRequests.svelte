<!-- Joueurs revenus sans leur jeton (autre téléphone, autre navigateur) : l'hôte confirme que c'est bien eux -->
<script>
  let { usernames = [], onAnswer } = $props();
</script>

{#each usernames as u (u)}
  <div class="rr" role="alert">
    <p><b>{u}</b> veut reprendre sa place depuis un autre téléphone. C'est bien cette personne ?</p>
    <div>
      <button class="rg-em" onclick={() => onAnswer(u, true)}>Rendre sa place</button>
      <button class="rg-em" onclick={() => onAnswer(u, false)}>Refuser</button>
    </div>
  </div>
{/each}

<style>
  .rr {
    display: grid; gap: 10px; flex-shrink: 0;
    margin: 12px 16px 0; padding: 12px 14px;
    border: 1px solid rgb(47 184 255 / 0.45); border-radius: 14px; background: rgb(47 184 255 / 0.07);
    font-size: 15px; line-height: 1.4; color: var(--soft);
  }
  .rr b { color: var(--text); }
  .rr div { display: flex; flex-wrap: wrap; gap: 8px; }

  @media (min-width: 900px) {
    .rr { grid-template-columns: minmax(0, 1fr) auto; align-items: center; margin: 14px 24px 0; }
  }
</style>
