<script>
  import { teamColor } from '$lib/data/salonOptions.js';

  /** Quelqu'un a buzzé : son nom en grand, et de quoi valider depuis l'écran si on n'a pas la régie sous la main. */
  let { buzzer, onJudge } = $props();
</script>

<div class="sh-buzz" style="--tc:{buzzer.team != null ? teamColor(buzzer.team) : 'var(--accent)'}">
  <p class="sx-kicker">Buzz !</p>
  <div class="sh-buzz-name">{buzzer.username}</div>
  <p class="sh-buzz-hint">À toi de répondre à voix haute</p>
  <div class="sh-buzz-actions">
    <button class="sx-btn sx-btn-primary sx-btn-lg" onclick={() => onJudge(true)}>Bonne réponse</button>
    <button class="sx-btn sx-btn-lg" onclick={() => onJudge(false)}>Raté</button>
  </div>
</div>
