<script>
  /**
   * Onglets de la régie. Même rendu à toutes les tailles : l'exploitant
   * retrouve les mêmes gestes depuis un téléphone, une tablette ou un second écran.
   *
   * @type {{ actif: string, joueurs: number, onChange: (id: string) => void }}
   */
  let { actif, joueurs, onChange } = $props();

  const ONGLETS = $derived([
    { id: 'direct', label: 'Direct' },
    { id: 'joueurs', label: 'Joueurs', badge: joueurs },
    { id: 'reglages', label: 'Réglages' },
  ]);
</script>

<nav class="rt" role="tablist" aria-label="Sections de la régie">
  {#each ONGLETS as o (o.id)}
    <button role="tab" aria-selected={actif === o.id} onclick={() => onChange(o.id)}>
      {o.label}{#if o.badge != null}<i>{o.badge}</i>{/if}
    </button>
  {/each}
</nav>

<style>
  .rt {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    flex-shrink: 0;
    border-bottom: 1px solid var(--line);
  }
  .rt button {
    min-height: 48px;
    border: 0;
    background: none;
    box-shadow: inset 0 -2px 0 transparent;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s, box-shadow 0.15s;
  }
  .rt button:hover { color: var(--text); }
  .rt button[aria-selected='true'] { color: var(--text); box-shadow: inset 0 -2px 0 var(--text); }
  .rt i {
    margin-left: 6px;
    padding: 1px 6px;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.1);
    color: var(--text);
    font-style: normal;
    letter-spacing: 0;
  }

  @media (min-width: 900px) {
    .rt { grid-template-columns: repeat(3, 176px); padding: 0 8px; }
  }
</style>
