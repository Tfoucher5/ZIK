<script>
  /**
   * Onglets de la régie. Même rendu à toutes les tailles : l'exploitant
   * retrouve les mêmes gestes qu'il pilote depuis un téléphone, une tablette
   * ou un second écran.
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
    <button
      role="tab"
      aria-selected={actif === o.id}
      class:on={actif === o.id}
      onclick={() => onChange(o.id)}
    >
      {o.label}{#if o.badge != null}<i>{o.badge}</i>{/if}
    </button>
  {/each}
</nav>

<style>
  .rt {
    display: flex;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    overflow-x: auto;
    scrollbar-width: none;
    /* Même colonne que le contenu et la barre d'actions : la console se lit
       comme un bloc unique au lieu de s'étirer sur toute la largeur. */
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
  }
  .rt::-webkit-scrollbar { display: none; }

  .rt button {
    flex: 1;
    min-width: 110px;
    /* 48px : cible confortable au doigt, c'est le support principal. */
    min-height: 48px;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 16px;
    background: none; border: none;
    border-bottom: 2px solid transparent;
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 800; font-size: 0.92rem; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--mid); cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .rt button:hover { color: var(--text); }
  .rt button.on { color: var(--accent); border-bottom-color: var(--accent); }

  .rt i {
    font-style: normal;
    font-family: var(--s-mono);
    font-size: 0.72rem;
    padding: 1px 7px;
    border-radius: 99px;
    background: var(--surface2);
    color: var(--mid);
  }
  .rt button.on i { background: rgb(var(--accent-rgb) / 0.14); color: var(--accent); }
</style>
