<script>
  /** Bandeaux et fenêtres de session : reconnexion, compte déjà en jeu, annonce admin. */
  let { g } = $props();
</script>

{#if g.showDcBanner}
  <div class="g-dc-banner">Reconnexion en cours&hellip;</div>
{/if}

{#if g.joinConflict}
  <div class="g-session-overlay" role="alertdialog">
    <div class="g-session-card">
      <h2>Ce compte joue déjà</h2>
      <p>
        Tu es dans la room <strong>{g.joinConflict.roomName}</strong> sous le pseudo
        <strong>{g.joinConflict.playerName}</strong>. Un même compte ne peut pas jouer
        depuis deux onglets à la fois.
      </p>
      <button class="g-session-btn" onclick={() => { g.joinConflict = null; g.socket?.takeOver(); }}>Continuer ici</button>
      <a class="g-session-link" href="/rooms">Retour aux rooms</a>
      <p class="g-session-note">L'autre onglet sera déconnecté.</p>
    </div>
  </div>
{/if}

{#if g.takenOver}
  <div class="g-session-overlay" role="alertdialog">
    <div class="g-session-card">
      <h2>Partie reprise ailleurs</h2>
      <p>Ce compte a rejoint une partie depuis un autre onglet. Celui-ci a été déconnecté.</p>
      <a class="g-session-btn" href="/rooms">Retour aux rooms</a>
    </div>
  </div>
{/if}

{#if g.adminAnnounceMsg}
  <div class="g-admin-announce" role="alert">
    <span class="g-announce-icon">📢</span>
    <span class="g-announce-text">{g.adminAnnounceMsg}</span>
  </div>
{/if}
