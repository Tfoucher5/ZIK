<script>
  /**
   * « Prépare la TV » : écran privé, posé par-dessus le lobby avant la
   * première partie. Trois gestes (régie, plein écran et son, test du son),
   * puis « Afficher le code ». Rien n'y est obligatoire : le code s'affiche
   * d'un clic, la partie peut toujours être lancée.
   */
  import { onDestroy } from 'svelte';
  import QrCode from '../QrCode.svelte';
  import { eqBars } from './lobbyView.js';

  let { h } = $props();

  const bars = eqBars(26);
  // 0 au début, 1 extrait en cours, 2 son entendu
  let step = $state(0);
  let playing = $state(false);
  let fullscreen = $state(false);
  let aide = $state('');
  let audio;

  let regieUrl = $derived(h.key ? `${location.origin}/salon/regie?code=${h.code}&key=${h.key}` : '');

  function testSound() {
    if (!document.fullscreenElement)
      document.documentElement.requestFullscreen?.().then(() => (fullscreen = true), () => {});
    else fullscreen = true;
    aide = '';
    step = 1;
    if (!audio) {
      audio = new Audio('/sounds/test-son.ogg');
      audio.loop = true;
      audio.onplaying = () => (playing = true);
      audio.onpause = () => (playing = false);
    }
    audio.volume = h.volume / 100;
    audio.currentTime = 0;
    audio.play().catch(() => {
      step = 0;
      aide = 'Le navigateur bloque le son : clique encore une fois.';
    });
  }

  function answer(ok) {
    h.setTvSound(ok);
    if (ok) {
      audio?.pause();
      step = 2;
    } else aide = 'Monte le volume de la TV, vérifie le câble HDMI, puis réponds encore.';
  }

  function showCode() {
    audio?.pause();
    h.showCode();
  }

  onDestroy(() => audio?.pause());
</script>

<section class="pp sh-tv" aria-label="Écran privé : prépare la TV">
  <header class="pp-top">
    <span class="pp-logo">ZIK<i></i><em>Soirée</em></span>
    <p class="pp-prive"><b>Écran privé</b>Le code n'est pas encore affiché</p>
  </header>

  <div class="pp-tete">
    <h1>Prépare la TV</h1>
    <p>Trois gestes sur cet ordinateur, puis tu affiches le code à tout le monde.</p>
  </div>

  <ol class="gestes">
    <li>
      <span class="n">01</span>
      <h2>Ta régie</h2>
      <p>Scanne ce QR avec ton téléphone : c'est ta télécommande pour la soirée.</p>
      {#if regieUrl}
        <div class="obj">
          <div class="pp-qr"><QrCode text={regieUrl} label="QR code de la régie" /></div>
          <small>Ce QR donne le contrôle de la soirée. Ne le montre pas aux joueurs.</small>
        </div>
      {/if}
      {#if h.controls > 0}
        <p class="st ok">✓ Régie connectée</p>
      {:else}
        <p class="st"><span class="sx-dots"><i></i><i></i><i></i></span> En attente du scan</p>
      {/if}
    </li>

    <li>
      <span class="n">02</span>
      <h2>Plein écran et son</h2>
      <p>Un clic suffit. Sans lui, le navigateur garde la musique coupée.</p>
      {#if step === 0}
        <div class="obj col"><button class="tbtn m" type="button" onclick={testSound}>Plein écran et activer le son</button></div>
        <p class="st">{aide || 'À faire'}</p>
      {:else}
        <div class="obj"><div class="faits">
          {#if fullscreen}<span>Plein écran</span>{/if}
          <span>Son activé</span>
        </div></div>
        <p class="st">{fullscreen ? '' : 'Plein écran refusé : appuie sur F11'}</p>
      {/if}
    </li>

    <li>
      <span class="n">03</span>
      <h2>Test du son</h2>
      <p>{step === 1 ? 'Tu entends la musique sur la TV ?' : 'Un extrait de musique pour régler le volume de la TV.'}</p>
      <div class="obj col">
        <div class="sh-eqz" class:vif={playing}>{#each bars as style, i (i)}<i {style}></i>{/each}</div>
        {#if step === 0}
          <button class="tbtn" type="button" onclick={testSound}>Tester le son</button>
        {:else if step === 1}
          <div class="duo">
            <button class="tbtn m" type="button" onclick={() => answer(true)}>Oui, ça joue</button>
            <button class="tbtn" type="button" onclick={() => answer(false)}>Non</button>
          </div>
        {:else}
          <button class="tbtn" type="button" onclick={testSound}>Rejouer le test</button>
        {/if}
      </div>
      {#if step === 2}
        <p class="st ok">✓ Son entendu</p>
      {:else}
        <p class="st" role="status">{step === 1 ? aide || 'Extrait en cours' : 'À faire'}</p>
      {/if}
    </li>
  </ol>

  <footer class="pp-bas">
    <p>Les joueurs ne voient rien tant que tu n'affiches pas le code.</p>
    <button class="tbtn" class:m={step === 2} type="button" onclick={showCode}>Afficher le code</button>
  </footer>
</section>
