<script>
  import { salonQrUrl } from '$lib/client/salonClient.js';

  /** Entracte : heure de reprise indicative (facultative) et code pour les retardataires. Le classement reste dans la colonne de droite. */
  let { intermission, code } = $props();

  let reprise = $derived(
    intermission.until
      ? new Date(intermission.until).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ')
      : null
  );
</script>

<section class="sh-pausebreak">
  <div>
    <p class="sx-kicker"><b>●</b> On souffle un peu</p>
    <h2>Entracte</h2>
    <p class="sh-pausebreak-when">{reprise ? `Reprise vers ${reprise}` : 'On reprend très vite'}</p>
    <p class="sh-pausebreak-join">Pas encore dans la partie ? <b>zik-music.fr/salon/play</b> · code <b>{code}</b></p>
  </div>
  <img class="sh-pausebreak-qr" src={salonQrUrl(code, 240)} alt="QR code pour rejoindre" width="240" height="240">
</section>
