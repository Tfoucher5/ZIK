<script>
  import { onMount } from 'svelte';

  /** État des services en direct, bien visible dans le pied de page. */
  let level = $state(null);

  const TEXT = {
    ok: 'Aucun incident en cours',
    incident: 'Incident en cours',
  };

  async function lire() {
    try {
      const res = await fetch('/api/statut');
      if (res.ok) level = (await res.json()).level;
    } catch {
      // Hors ligne : la pastille garde son dernier état
    }
  }

  onMount(() => {
    lire();
    const t = setInterval(lire, 5 * 60 * 1000);
    return () => clearInterval(t);
  });
</script>

<div class="sp-wrap">
  <a class="sp-pill {level ?? ''}" href="/statut">
    <i aria-hidden="true"></i>
    <span>{TEXT[level] ?? 'État des services'}</span>
    <small>Voir le détail</small>
  </a>
</div>

<style>
  .sp-wrap {
    display: flex;
    justify-content: center;
    padding: 16px clamp(20px, 5vw, 48px) 4px;
  }
  .sp-pill {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 4px 10px;
    min-height: 44px;
    padding: 8px 18px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--text);
    font-weight: 600;
    text-decoration: none;
    transition: border-color 0.15s;
  }
  .sp-pill:hover,
  .sp-pill:focus-visible { border-color: var(--mid); }
  i {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--mid);
  }
  .ok i { background: var(--success); }
  .incident i { background: var(--danger); }
  small {
    color: var(--mid);
    font-size: 0.85em;
    font-weight: 500;
    text-decoration: underline;
  }
</style>
