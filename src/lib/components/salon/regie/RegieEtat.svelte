<script>
  /**
   * Bandeau sous les onglets Joueurs et Réglages pendant la partie : la
   * manche, le chrono et les réponses (ou qui a buzzé) restent sous les yeux.
   * Seul le changement de manche est annoncé, pas le chrono à chaque seconde.
   * @type {{ round: number, maxRounds: number, paused: boolean, chrono: string, p: number,
   *   repondu: number, joueurs: number, buzzer: string|null }}
   */
  let { round, maxRounds, paused, chrono, p, repondu, joueurs, buzzer } = $props();
</script>

<p class="re">
  <b aria-hidden="true">●</b><span aria-live="polite">{paused ? 'En pause' : 'Manche'} {round} / {maxRounds}</span>
  {#if chrono}<strong>{chrono}</strong>{/if}
  <span class="re-droite">{buzzer ? `${buzzer} a buzzé` : `${repondu} / ${joueurs} ont répondu`}</span>
  <span class="rg-jauge re-jauge"><i style="--p:{p}"></i></span>
</p>

<style>
  .re {
    position: relative;
    display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    min-height: 44px; padding: 0 16px;
    border-bottom: 1px solid var(--line);
    font-family: var(--mono); font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase;
    color: var(--soft); white-space: nowrap;
  }
  .re > b { color: var(--ok); font-size: 10px; }
  .re strong { color: var(--text); font-size: 16px; font-variant-numeric: tabular-nums; }
  .re-droite { margin-left: auto; overflow: hidden; text-overflow: ellipsis; }
  .re-jauge { position: absolute; inset: auto 0 -1px 0; height: 2px; border-radius: 0; background: none; }

  @media (min-width: 900px) {
    .re { gap: 14px; padding: 0 24px; }
    .re-droite { margin-left: 10px; }
  }
</style>
