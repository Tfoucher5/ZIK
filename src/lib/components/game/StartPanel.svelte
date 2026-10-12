<script>
  // Avant la partie : bouton de lancement, compte à rebours ou attente de l'admin
  let {
    roomId, adminLocked, showStart, showCountdown, countdownVal,
    hasOwner, autoStart, isAdmin, disabled, loading, alone, onStart,
  } = $props();

  let linkCopied = $state(false);

  async function copyLink() {
    await navigator.clipboard.writeText(`https://www.zik-music.fr/room/${roomId}`);
    linkCopied = true;
    setTimeout(() => (linkCopied = false), 2000);
  }
</script>

{#if adminLocked}
  <div class="g-admin-lock">
    🔒 Cette room est verrouillée par un administrateur.<br>
    <small>Le lancement de partie est temporairement désactivé.</small>
  </div>
{/if}
{#if showStart && !adminLocked}
  {#if showCountdown}
    <div class="g-countdown">
      <div class="g-countdown-circle">{countdownVal}</div>
      <p class="g-countdown-label">La partie d&eacute;marre&hellip;</p>
    </div>
  {:else if hasOwner && autoStart && !isAdmin}
    <div class="g-waiting">&#x23F3; La partie va d&eacute;marrer automatiquement&hellip;</div>
  {:else if hasOwner && !autoStart && !isAdmin}
    <div class="g-waiting">
      &#x23F3; En attente de l&apos;administrateur&hellip;<br>
      <small>Seul le cr&eacute;ateur peut lancer la partie.</small>
    </div>
  {:else}
    <button class="g-start-btn" onclick={onStart} disabled={disabled}>
      {#if loading}Chargement&hellip;{:else}&#x1F3AE; Lancer la partie{/if}
    </button>
    {#if hasOwner && !autoStart}
      <p class="g-admin-hint">Tu es l&apos;admin &mdash; toi seul peux lancer.</p>
    {/if}
  {/if}
  {#if !showCountdown && alone}
    <!-- Seul dans la room : le jeu est pensé pour plusieurs, on donne les moyens d'en ramener -->
    <div class="g-alone">
      <p>Tu es seul pour l&apos;instant. Le blind test, c&apos;est mieux à plusieurs&nbsp;!</p>
      <div class="g-alone-actions">
        <button class="g-alone-btn" onclick={copyLink}>{linkCopied ? 'Lien copié' : 'Copier le lien de la room'}</button>
        <a class="g-alone-btn" href="/salon">Soirée entre amis : Mode Salon</a>
      </div>
    </div>
  {/if}
{/if}

<style>
  .g-alone {
    margin-top: 18px;
    padding: 14px 16px;
    border: 1px dashed var(--border2);
    border-radius: 12px;
    text-align: center;
    max-width: 420px;
  }
  .g-alone p {
    font-size: 0.85rem;
    color: var(--mid);
    margin: 0 0 10px;
  }
  .g-alone-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .g-alone-btn {
    background: none;
    border: 1px solid rgb(var(--accent-rgb) / 0.45);
    color: var(--accent);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    padding: 7px 14px;
    border-radius: 8px;
    cursor: pointer;
    text-decoration: none;
  }
  .g-alone-btn:hover {
    background: rgb(var(--accent-rgb) / 0.1);
  }
</style>
