<script>
  import { enhance } from '$app/forms';

  /** Bascules « officielle » et « publique » d'une playlist. */
  let { pl, keep } = $props();
</script>

<form method="POST" action="?/toggleFlag" use:enhance={keep}>
  <input type="hidden" name="id" value={pl.id} />
  <input type="hidden" name="field" value="is_official" />
  <input type="hidden" name="value" value={String(!pl.is_official)} />
  <button class="flag" class:on-star={pl.is_official} title={pl.is_official ? 'Retirer des officielles' : 'Rendre officielle'}>
    ★ <span>{pl.is_official ? 'Officielle' : 'Non officielle'}</span>
  </button>
</form>
<form method="POST" action="?/toggleFlag" use:enhance={keep}>
  <input type="hidden" name="id" value={pl.id} />
  <input type="hidden" name="field" value="is_public" />
  <input type="hidden" name="value" value={String(!pl.is_public)} />
  <button class="flag" class:on={pl.is_public} title={pl.is_public ? 'Rendre privée' : 'Rendre publique'}>
    {pl.is_public ? '●' : '○'} <span>{pl.is_public ? 'Publique' : 'Privée'}</span>
  </button>
</form>

<style>
  .flag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 32px;
    padding: 4px 8px;
    border: 1px solid var(--a-line);
    border-radius: 99px;
    background: none;
    color: var(--a-dim);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
  }
  .flag.on { border-color: var(--a-good); color: var(--a-good); }
  .flag.on-star { border-color: var(--a-warn); color: var(--a-warn); }
</style>
